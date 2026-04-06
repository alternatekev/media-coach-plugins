using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Xml.Linq;
using Newtonsoft.Json.Linq;

namespace RaceCorProDrive.Plugin.Engine
{
    /// <summary>
    /// Parses LMU/rFactor 2 XML race result files from the game's UserData/Log/Results/ directory.
    /// Each XML file contains one session (practice, qualifying, or race) with driver results.
    ///
    /// XML Structure (rF2/LMU standard):
    ///   rFactorXML > RaceResults > Race/Qualify/Practice > Driver elements
    /// </summary>
    public class LMUResultsParser
    {
        private string _lastError;

        /// <summary>Last error message from parsing or scanning.</summary>
        public string LastError => _lastError;

        /// <summary>
        /// Get possible results directories for LMU and rFactor 2.
        /// </summary>
        public static List<string> GetResultsDirectories()
        {
            var dirs = new List<string>();
            string docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

            // LMU standard location
            dirs.Add(Path.Combine(docs, "Le Mans Ultimate", "UserData", "Log", "Results"));
            // rFactor 2 standard location
            dirs.Add(Path.Combine(docs, "rFactor2", "UserData", "Log", "Results"));
            // Some Steam installs use a different structure
            dirs.Add(Path.Combine(docs, "My Games", "Le Mans Ultimate", "UserData", "Log", "Results"));

            return dirs;
        }

        /// <summary>
        /// Scan results directories and parse all XML result files.
        /// Returns a JSON payload suitable for POSTing to /api/lmu/import.
        /// </summary>
        /// <param name="playerName">Filter to sessions where this player participated. If null, uses isPlayer flag or first driver.</param>
        /// <param name="maxFiles">Maximum number of files to parse (newest first).</param>
        public JObject ExportSessionHistory(string playerName = null, int maxFiles = 200)
        {
            var sessions = new JArray();
            var resultDirs = GetResultsDirectories();
            var allFiles = new List<FileInfo>();

            foreach (var dir in resultDirs)
            {
                if (!Directory.Exists(dir)) continue;

                try
                {
                    var dirInfo = new DirectoryInfo(dir);
                    allFiles.AddRange(dirInfo.GetFiles("*.xml", SearchOption.AllDirectories));
                }
                catch (Exception ex)
                {
                    SimHub.Logging.Current.Warn($"[LMUResults] Could not scan {dir}: {ex.Message}");
                }
            }

            if (allFiles.Count == 0)
            {
                _lastError = "No LMU/rF2 result files found. Check that results are saved to Documents/Le Mans Ultimate/UserData/Log/Results/";
                return null;
            }

            // Sort newest first, limit to maxFiles
            allFiles = allFiles.OrderByDescending(f => f.LastWriteTimeUtc).Take(maxFiles).ToList();

            SimHub.Logging.Current.Info($"[LMUResults] Found {allFiles.Count} result files to parse");

            foreach (var file in allFiles)
            {
                try
                {
                    var session = ParseResultFile(file.FullName, playerName);
                    if (session != null)
                        sessions.Add(session);
                }
                catch (Exception ex)
                {
                    SimHub.Logging.Current.Warn($"[LMUResults] Failed to parse {file.Name}: {ex.Message}");
                }
            }

            SimHub.Logging.Current.Info($"[LMUResults] Parsed {sessions.Count} valid sessions from {allFiles.Count} files");

            return new JObject
            {
                ["driverName"] = playerName ?? "",
                ["sessions"] = sessions,
                ["scannedFiles"] = allFiles.Count,
                ["exportedAt"] = DateTime.UtcNow.ToString("o"),
            };
        }

        /// <summary>
        /// Parse a single rFactor 2 / LMU XML results file.
        /// </summary>
        private JObject ParseResultFile(string filePath, string playerName)
        {
            var doc = XDocument.Load(filePath);
            var raceResults = doc.Root?.Element("RaceResults");
            if (raceResults == null) return null;

            string trackName = raceResults.Element("TrackCourse")?.Value ?? "Unknown";
            string trackEvent = raceResults.Element("TrackEvent")?.Value ?? "";
            string sessionType = raceResults.Element("SessionType")?.Value ?? "Race";
            string sessionLength = raceResults.Element("SessionLength")?.Value ?? "";
            string weather = raceResults.Element("Weather")?.Value ?? "";
            string dateTime = raceResults.Element("DateTime")?.Value ?? "";
            string modName = raceResults.Element("ModnameShort")?.Value ?? "LMU";
            double trackLength = 0;
            double.TryParse(raceResults.Element("TrackLength")?.Value ?? "0",
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out trackLength);

            // Find the results container — Race, Qualify, Practice, or Warmup
            var resultsContainer = raceResults.Element("Race")
                ?? raceResults.Element("Qualify")
                ?? raceResults.Element("Practice")
                ?? raceResults.Element("Warmup");

            if (resultsContainer == null) return null;

            var drivers = resultsContainer.Elements("Driver").ToList();
            if (drivers.Count == 0) return null;

            // Find the player's entry
            XElement playerEntry = null;
            if (!string.IsNullOrEmpty(playerName))
            {
                playerEntry = drivers.FirstOrDefault(d =>
                    string.Equals(d.Element("Name")?.Value?.Trim(), playerName.Trim(),
                        StringComparison.OrdinalIgnoreCase));
            }

            // Fallback: look for isPlayer flag, then first driver
            if (playerEntry == null)
            {
                playerEntry = drivers.FirstOrDefault(d =>
                    d.Element("isPlayer")?.Value == "1") ?? drivers.FirstOrDefault();
            }

            if (playerEntry == null) return null;

            // Deterministic game ID from filename for deduplication
            string gameId = $"lmu_{Path.GetFileNameWithoutExtension(filePath)}";

            // Parse numeric fields
            int finishPosition = 0;
            int.TryParse(playerEntry.Element("Position")?.Value ?? "0", out finishPosition);
            int gridPosition = 0;
            int.TryParse(playerEntry.Element("GridPos")?.Value ?? "0", out gridPosition);
            int completedLaps = 0;
            int.TryParse(playerEntry.Element("Laps")?.Value ?? "0", out completedLaps);
            int penalties = 0;
            int.TryParse(playerEntry.Element("Penalties")?.Value ?? "0", out penalties);
            int pitstops = 0;
            int.TryParse(playerEntry.Element("Pitstops")?.Value ?? "0", out pitstops);
            int dnfReason = 0;
            int.TryParse(playerEntry.Element("DNFReason")?.Value ?? "0", out dnfReason);

            double bestLapTime = 0;
            double.TryParse(playerEntry.Element("BestLapTime")?.Value ?? "0",
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out bestLapTime);
            double finishTime = 0;
            double.TryParse(playerEntry.Element("FinishTime")?.Value ?? "0",
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out finishTime);

            string carName = playerEntry.Element("VehName")?.Value ?? "Unknown";
            string carClass = playerEntry.Element("CarClass")?.Value ?? "";
            string carType = playerEntry.Element("CarType")?.Value ?? "";

            // Parse per-lap data
            var laps = new JArray();
            foreach (var lap in playerEntry.Elements("Lap"))
            {
                double lapTime = 0, s1 = 0, s2 = 0, s3 = 0;
                double.TryParse(lap.Element("LapTime")?.Value ?? "0",
                    System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture, out lapTime);
                double.TryParse(lap.Element("Sector1")?.Value ?? "0",
                    System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture, out s1);
                double.TryParse(lap.Element("Sector2")?.Value ?? "0",
                    System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture, out s2);
                double.TryParse(lap.Element("Sector3")?.Value ?? "0",
                    System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture, out s3);

                var lapObj = new JObject
                {
                    ["lapTime"] = lapTime,
                    ["sector1"] = s1,
                    ["sector2"] = s2,
                    ["sector3"] = s3,
                };

                double fuelUsed = 0;
                if (double.TryParse(lap.Element("FuelUsed")?.Value ?? "",
                    System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture, out fuelUsed))
                {
                    lapObj["fuelUsed"] = fuelUsed;
                }

                var tireWear = lap.Element("TireWear");
                if (tireWear != null)
                {
                    lapObj["tireWear"] = new JObject
                    {
                        ["fl"] = tireWear.Attribute("FL")?.Value ?? "",
                        ["fr"] = tireWear.Attribute("FR")?.Value ?? "",
                        ["rl"] = tireWear.Attribute("RL")?.Value ?? "",
                        ["rr"] = tireWear.Attribute("RR")?.Value ?? "",
                    };
                }

                laps.Add(lapObj);
            }

            // Parse session date
            DateTime sessionDate = DateTime.MinValue;
            if (!string.IsNullOrEmpty(dateTime))
                DateTime.TryParse(dateTime, out sessionDate);
            if (sessionDate == DateTime.MinValue)
                sessionDate = File.GetLastWriteTimeUtc(filePath);

            return new JObject
            {
                ["gameId"] = gameId,
                ["trackName"] = trackName,
                ["trackEvent"] = trackEvent,
                ["trackLengthKm"] = trackLength,
                ["sessionType"] = sessionType,
                ["sessionLength"] = sessionLength,
                ["weather"] = weather,
                ["modName"] = modName,
                ["carName"] = carName,
                ["carClass"] = carClass,
                ["manufacturer"] = carType,
                ["finishPosition"] = finishPosition,
                ["gridPosition"] = gridPosition,
                ["completedLaps"] = completedLaps,
                ["totalDrivers"] = drivers.Count,
                ["penalties"] = penalties,
                ["pitstops"] = pitstops,
                ["dnfReason"] = dnfReason > 0 ? $"DNF (code {dnfReason})" : null,
                ["bestLapTime"] = bestLapTime,
                ["finishTime"] = finishTime,
                ["driverName"] = playerEntry.Element("Name")?.Value ?? "",
                ["laps"] = laps,
                ["startedAt"] = sessionDate.ToString("o"),
                ["finishedAt"] = sessionDate.AddSeconds(finishTime).ToString("o"),
            };
        }
    }
}
