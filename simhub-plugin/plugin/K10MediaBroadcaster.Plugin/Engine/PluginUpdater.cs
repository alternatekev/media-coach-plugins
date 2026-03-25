using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace K10MediaBroadcaster.Plugin.Engine
{
    /// <summary>
    /// Checks GitHub Releases for new plugin versions and downloads
    /// the installer. After download, launches the installer and
    /// signals SimHub to restart.
    /// </summary>
    public class PluginUpdater
    {
        private const string GitHubApiUrl =
            "https://api.github.com/repos/alternatekev/media-coach-simhub-plugin/releases/latest";
        private const string UserAgent = "K10MediaBroadcaster-Plugin";

        public string CurrentVersion { get; }
        public string LatestVersion { get; private set; }
        public string DownloadUrl { get; private set; }
        public string ReleaseNotes { get; private set; }
        public bool UpdateAvailable { get; private set; }
        public bool IsChecking { get; private set; }
        public bool IsDownloading { get; private set; }
        public int DownloadPercent { get; private set; }
        public string ErrorMessage { get; private set; }

        public event Action StateChanged;

        public PluginUpdater()
        {
            // Read the current assembly version
            var asm = typeof(PluginUpdater).Assembly;
            var ver = asm.GetName().Version;
            CurrentVersion = ver != null ? $"{ver.Major}.{ver.Minor}.{ver.Build}" : "0.0.0";
        }

        /// <summary>
        /// Queries the GitHub Releases API for the latest release.
        /// Looks for an asset matching *Setup*.exe in the release.
        /// </summary>
        public async Task CheckForUpdateAsync()
        {
            if (IsChecking) return;
            IsChecking = true;
            ErrorMessage = null;
            StateChanged?.Invoke();

            try
            {
                // TLS 1.2 required for GitHub API
                ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;

                var request = (HttpWebRequest)WebRequest.Create(GitHubApiUrl);
                request.UserAgent = UserAgent;
                request.Accept = "application/vnd.github+json";
                request.Timeout = 15000;

                using (var response = (HttpWebResponse)await Task.Factory.FromAsync(
                    request.BeginGetResponse, request.EndGetResponse, null))
                using (var reader = new StreamReader(response.GetResponseStream()))
                {
                    var json = JObject.Parse(await reader.ReadToEndAsync());

                    // Parse version from tag (e.g. "v1.2.3" or "1.2.3")
                    var tag = json["tag_name"]?.ToString() ?? "";
                    LatestVersion = Regex.Replace(tag, @"^v", "");
                    ReleaseNotes = json["body"]?.ToString() ?? "";

                    // Find the Setup exe asset
                    DownloadUrl = null;
                    var assets = json["assets"] as JArray;
                    if (assets != null)
                    {
                        foreach (var asset in assets)
                        {
                            var name = asset["name"]?.ToString() ?? "";
                            if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) &&
                                name.IndexOf("Setup", StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                DownloadUrl = asset["browser_download_url"]?.ToString();
                                break;
                            }
                        }
                    }

                    // Compare versions
                    UpdateAvailable = IsNewerVersion(LatestVersion, CurrentVersion) && DownloadUrl != null;
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Update check failed: {ex.Message}";
                UpdateAvailable = false;
            }
            finally
            {
                IsChecking = false;
                StateChanged?.Invoke();
            }
        }

        /// <summary>
        /// Downloads the installer to a temp file, then launches it.
        /// SimHub will need to be restarted by the installer.
        /// </summary>
        public async Task DownloadAndInstallAsync()
        {
            if (IsDownloading || string.IsNullOrEmpty(DownloadUrl)) return;
            IsDownloading = true;
            DownloadPercent = 0;
            ErrorMessage = null;
            StateChanged?.Invoke();

            try
            {
                ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;

                var tempPath = Path.Combine(Path.GetTempPath(),
                    $"K10-Media-Broadcaster-Setup-{LatestVersion}.exe");

                using (var client = new WebClient())
                {
                    client.Headers.Add("User-Agent", UserAgent);
                    client.DownloadProgressChanged += (s, e) =>
                    {
                        DownloadPercent = e.ProgressPercentage;
                        StateChanged?.Invoke();
                    };

                    await client.DownloadFileTaskAsync(new Uri(DownloadUrl), tempPath);
                }

                // Launch the installer (it will handle closing SimHub)
                Process.Start(new ProcessStartInfo
                {
                    FileName = tempPath,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Download failed: {ex.Message}";
            }
            finally
            {
                IsDownloading = false;
                StateChanged?.Invoke();
            }
        }

        private static bool IsNewerVersion(string remote, string local)
        {
            try
            {
                var r = new Version(NormalizeVersion(remote));
                var l = new Version(NormalizeVersion(local));
                return r > l;
            }
            catch
            {
                return false;
            }
        }

        private static string NormalizeVersion(string v)
        {
            // Ensure version has at least 3 parts (Major.Minor.Build)
            var parts = v.Split('.');
            while (parts.Length < 3)
            {
                v += ".0";
                parts = v.Split('.');
            }
            return v;
        }
    }
}
