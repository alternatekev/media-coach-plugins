using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace RaceCorProDrive.Plugin.Engine
{
    /// <summary>
    /// Reads LMU's native DuckDB telemetry recordings to extract post-session enrichment data.
    ///
    /// LMU v1.2+ records telemetry to DuckDB files in UserData/Telemetry/.
    /// These contain high-frequency channel data per lap including engine, suspension,
    /// tire, fuel, hybrid, and chassis metrics.
    ///
    /// Strategy: shell out to the DuckDB CLI to extract summary stats as JSON.
    /// If the CLI isn't installed, enrichment is gracefully skipped.
    /// </summary>
    public class LMUTelemetryReader
    {
        private string _lastError;
        private string _duckDbCliPath;

        /// <summary>Last error message.</summary>
        public string LastError => _lastError;

        /// <summary>Whether the DuckDB CLI was found and is usable.</summary>
        public bool IsAvailable => !string.IsNullOrEmpty(_duckDbCliPath);

        /// <summary>
        /// Get possible telemetry directories for LMU.
        /// </summary>
        public static List<string> GetTelemetryDirectories()
        {
            var dirs = new List<string>();
            string docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

            dirs.Add(Path.Combine(docs, "Le Mans Ultimate", "UserData", "Telemetry"));
            dirs.Add(Path.Combine(docs, "rFactor2", "UserData", "Telemetry"));
            dirs.Add(Path.Combine(docs, "My Games", "Le Mans Ultimate", "UserData", "Telemetry"));

            return dirs;
        }

        /// <summary>
        /// Try to locate the DuckDB CLI on the system.
        /// </summary>
        public bool FindDuckDbCli()
        {
            // Check if duckdb is on PATH
            try
            {
                var psi = new ProcessStartInfo("duckdb", "--version")
                {
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true,
                };
                using (var proc = Process.Start(psi))
                {
                    proc.WaitForExit(5000);
                    if (proc.ExitCode == 0)
                    {
                        _duckDbCliPath = "duckdb";
                        SimHub.Logging.Current.Info("[LMUTelemetry] Found DuckDB CLI on PATH");
                        return true;
                    }
                }
            }
            catch { }

            // Check common Windows install locations
            var candidates = new[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "duckdb", "duckdb.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "DuckDB", "duckdb.exe"),
                @"C:\duckdb\duckdb.exe",
            };

            foreach (var path in candidates)
            {
                if (File.Exists(path))
                {
                    _duckDbCliPath = path;
                    SimHub.Logging.Current.Info($"[LMUTelemetry] Found DuckDB CLI at {path}");
                    return true;
                }
            }

            _lastError = "DuckDB CLI not found. Install from https://duckdb.org/docs/installation/ for telemetry enrichment.";
            return false;
        }

        /// <summary>
        /// Find the most recent telemetry files matching a track/car filter.
        /// </summary>
        public List<FileInfo> FindTelemetryFiles(string trackFilter = null, string carFilter = null, int maxFiles = 10)
        {
            var allFiles = new List<FileInfo>();

            foreach (var dir in GetTelemetryDirectories())
            {
                if (!Directory.Exists(dir)) continue;

                try
                {
                    var dirInfo = new DirectoryInfo(dir);
                    allFiles.AddRange(dirInfo.GetFiles("*.duckdb", SearchOption.AllDirectories));
                    allFiles.AddRange(dirInfo.GetFiles("*.db", SearchOption.AllDirectories));
                }
                catch (Exception ex)
                {
                    SimHub.Logging.Current.Warn($"[LMUTelemetry] Could not scan {dir}: {ex.Message}");
                }
            }

            // Filter by name if track/car specified
            if (!string.IsNullOrEmpty(trackFilter))
            {
                var filter = trackFilter.ToLowerInvariant();
                allFiles = allFiles.Where(f => f.Name.ToLowerInvariant().Contains(filter)).ToList();
            }

            return allFiles.OrderByDescending(f => f.LastWriteTimeUtc).Take(maxFiles).ToList();
        }

        /// <summary>
        /// Extract session summary statistics from a DuckDB telemetry file.
        /// </summary>
        public JObject ExtractSessionSummary(string dbFilePath)
        {
            if (string.IsNullOrEmpty(_duckDbCliPath))
            {
                if (!FindDuckDbCli())
                    return null;
            }

            try
            {
                // Discover available tables
                string tables = RunDuckDbQuery(dbFilePath, "SHOW TABLES;");
                if (string.IsNullOrEmpty(tables))
                {
                    _lastError = "No tables found in telemetry file";
                    return null;
                }

                var result = new JObject();
                result["sourceFile"] = Path.GetFileName(dbFilePath);
                result["fileDate"] = File.GetLastWriteTimeUtc(dbFilePath).ToString("o");

                var tableList = tables.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(t => t.Trim()).Where(t => !string.IsNullOrEmpty(t)).ToList();

                result["tables"] = new JArray(tableList);

                // Extract schema for each table
                foreach (var table in tableList)
                {
                    try
                    {
                        string schema = RunDuckDbQuery(dbFilePath,
                            $"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}';");
                        if (!string.IsNullOrEmpty(schema))
                        {
                            var columns = schema.Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries)
                                .Select(line => line.Trim()).Where(l => !string.IsNullOrEmpty(l)).ToList();
                            result[$"schema_{table}"] = new JArray(columns);
                        }
                    }
                    catch { }
                }

                // Try common telemetry extractions — these may fail if LMU uses different column names
                TryExtractLapSummary(dbFilePath, result);
                TryExtractFuelSummary(dbFilePath, result);
                TryExtractTireWear(dbFilePath, result);

                return result;
            }
            catch (Exception ex)
            {
                _lastError = $"Telemetry extraction failed: {ex.Message}";
                SimHub.Logging.Current.Error($"[LMUTelemetry] Extraction error: {ex}");
                return null;
            }
        }

        /// <summary>
        /// Extract enrichment data for the most recent session matching the given track/car.
        /// Called after a race ends to enrich the session record.
        /// </summary>
        public JObject EnrichLastSession(string trackName = null, string carModel = null)
        {
            var files = FindTelemetryFiles(trackName, carModel, 3);
            if (files.Count == 0)
            {
                _lastError = "No matching telemetry files found";
                return null;
            }

            foreach (var file in files)
            {
                var summary = ExtractSessionSummary(file.FullName);
                if (summary != null)
                    return summary;
            }

            return null;
        }

        // ── Query helpers ──────────────────────────────────────────

        private void TryExtractLapSummary(string dbPath, JObject result)
        {
            try
            {
                string query = @"
                    SELECT
                        COUNT(*) as total_laps,
                        MIN(lap_time) as best_lap,
                        AVG(lap_time) as avg_lap,
                        MAX(lap_time) as worst_lap,
                        STDDEV(lap_time) as consistency
                    FROM (
                        SELECT DISTINCT lap_number,
                            MAX(elapsed_time) - MIN(elapsed_time) as lap_time
                        FROM telemetry
                        WHERE lap_number > 0
                        GROUP BY lap_number
                    ) laps
                    WHERE lap_time > 10;";
                string data = RunDuckDbQuery(dbPath, query);
                if (!string.IsNullOrEmpty(data))
                    result["lapSummary"] = data.Trim();
            }
            catch { }
        }

        private void TryExtractFuelSummary(string dbPath, JObject result)
        {
            try
            {
                string query = @"
                    SELECT
                        MAX(fuel_level) as max_fuel,
                        MIN(fuel_level) as min_fuel,
                        MAX(fuel_level) - MIN(fuel_level) as total_consumed,
                        (MAX(fuel_level) - MIN(fuel_level)) / NULLIF(MAX(lap_number), 0) as avg_per_lap
                    FROM telemetry
                    WHERE fuel_level > 0;";
                string data = RunDuckDbQuery(dbPath, query);
                if (!string.IsNullOrEmpty(data))
                    result["fuelSummary"] = data.Trim();
            }
            catch { }
        }

        private void TryExtractTireWear(string dbPath, JObject result)
        {
            try
            {
                string query = @"
                    SELECT
                        lap_number,
                        AVG(tire_wear_fl) as wear_fl,
                        AVG(tire_wear_fr) as wear_fr,
                        AVG(tire_wear_rl) as wear_rl,
                        AVG(tire_wear_rr) as wear_rr
                    FROM telemetry
                    WHERE lap_number > 0 AND tire_wear_fl > 0
                    GROUP BY lap_number
                    ORDER BY lap_number;";
                string data = RunDuckDbQuery(dbPath, query);
                if (!string.IsNullOrEmpty(data))
                    result["tireWearByLap"] = data.Trim();
            }
            catch { }
        }

        /// <summary>
        /// Run a SQL query against a DuckDB file using the CLI tool.
        /// </summary>
        private string RunDuckDbQuery(string dbPath, string query)
        {
            try
            {
                var psi = new ProcessStartInfo(_duckDbCliPath, $"\"{dbPath}\" -csv -noheader")
                {
                    UseShellExecute = false,
                    RedirectStandardInput = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                    StandardOutputEncoding = System.Text.Encoding.UTF8,
                };

                using (var proc = Process.Start(psi))
                {
                    proc.StandardInput.WriteLine(query);
                    proc.StandardInput.Close();

                    string output = proc.StandardOutput.ReadToEnd();
                    string error = proc.StandardError.ReadToEnd();

                    proc.WaitForExit(15000);

                    if (!string.IsNullOrEmpty(error) && proc.ExitCode != 0)
                    {
                        SimHub.Logging.Current.Warn($"[LMUTelemetry] DuckDB query warning: {error}");
                        return null;
                    }

                    return output;
                }
            }
            catch (Exception ex)
            {
                SimHub.Logging.Current.Warn($"[LMUTelemetry] DuckDB query failed: {ex.Message}");
                return null;
            }
        }
    }
}
