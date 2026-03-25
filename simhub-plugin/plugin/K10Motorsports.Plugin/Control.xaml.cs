using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;
using SimHub.Plugins;
using K10Motorsports.Plugin.Engine;
using WinForms = System.Windows.Forms;

namespace K10Motorsports.Plugin
{
    public partial class SettingsControl : UserControl
    {
        private readonly Plugin _plugin;
        private readonly PluginUpdater _updater = new PluginUpdater();
        private bool _loading = true;

        public SettingsControl(Plugin plugin)
        {
            _plugin = plugin;
            InitializeComponent();
            LoadSettings();
            RefreshTrackLists();
            _loading = false;

            UpdateStatusLabel.Text = $"Current version: v{_updater.CurrentVersion}";

            // Wire up state change notifications (may fire from background thread)
            _updater.StateChanged += () =>
            {
                Dispatcher.BeginInvoke(new Action(RefreshUpdateUI));
            };
        }

        private void LoadSettings()
        {
            var s = _plugin.Settings;

            DisplaySlider.Value = s.PromptDisplaySeconds;
            DisplayLabel.Text   = $"{s.PromptDisplaySeconds:0} s";

            ShowTitleCheck.IsChecked  = s.ShowTopicTitle;
            EventOnlyCheck.IsChecked  = s.EventOnlyMode;
            DemoModeCheck.IsChecked   = s.DemoMode;
bool allEnabled = s.EnabledCategories == null || s.EnabledCategories.Count == 0;
            CatHardware.IsChecked    = allEnabled || s.EnabledCategories.Contains("hardware");
            CatGameFeel.IsChecked    = allEnabled || s.EnabledCategories.Contains("game_feel");
            CatCarResponse.IsChecked = allEnabled || s.EnabledCategories.Contains("car_response");
            CatRacingExp.IsChecked   = allEnabled || s.EnabledCategories.Contains("racing_experience");

            TopicsPathBox.Text = s.TopicsFilePath ?? "";
        }

        private void DisplaySlider_ValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
        {
            if (_loading) return;
            _plugin.Settings.PromptDisplaySeconds = DisplaySlider.Value;
            DisplayLabel.Text = $"{DisplaySlider.Value:0} s";
            SaveAndApply();
        }

        private void ShowTitleCheck_Changed(object sender, RoutedEventArgs e)
        {
            if (_loading) return;
            _plugin.Settings.ShowTopicTitle = ShowTitleCheck.IsChecked == true;
            SaveAndApply();
        }

        private void EventOnlyCheck_Changed(object sender, RoutedEventArgs e)
        {
            if (_loading) return;
            _plugin.Settings.EventOnlyMode = EventOnlyCheck.IsChecked == true;
            SaveAndApply();
        }

        private void Category_Changed(object sender, RoutedEventArgs e)
        {
            if (_loading) return;
            var cats = new List<string>();
            if (CatHardware.IsChecked    == true) cats.Add("hardware");
            if (CatGameFeel.IsChecked    == true) cats.Add("game_feel");
            if (CatCarResponse.IsChecked == true) cats.Add("car_response");
            if (CatRacingExp.IsChecked   == true) cats.Add("racing_experience");

            // If all 4 are checked, clear the list (= all enabled)
            _plugin.Settings.EnabledCategories = cats.Count == 4 ? new List<string>() : cats;
            SaveAndApply();
        }

        private void TopicsPathBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            if (_loading) return;
            _plugin.Settings.TopicsFilePath = TopicsPathBox.Text.Trim();
            SaveAndApply();
        }

        private void DemoModeCheck_Changed(object sender, RoutedEventArgs e)
        {
            if (_loading) return;
            _plugin.Settings.DemoMode = DemoModeCheck.IsChecked == true;
            SaveAndApply();
        }

private void BrowseTopics_Click(object sender, RoutedEventArgs e)
        {
            var dlg = new OpenFileDialog
            {
                Filter = "JSON Files (*.json)|*.json|All Files (*.*)|*.*",
                Title  = "Select commentary_topics.json"
            };
            if (dlg.ShowDialog() == true)
            {
                TopicsPathBox.Text = dlg.FileName;
                _plugin.Settings.TopicsFilePath = dlg.FileName;
                SaveAndApply();
            }
        }

        private void RefreshTrackLists()
        {
            try
            {
                // Show the trackmaps folder path
                var searchPaths = _plugin.GetTrackMapSearchPaths();
                string activePath = "(not resolved)";
                foreach (var p in searchPaths)
                {
                    if (Directory.Exists(p)) { activePath = p; break; }
                }
                TrackMapsDirLabel.Text = $"Folder: {activePath}";

                var bundled = _plugin.GetBundledTrackIds();
                BundledTracksList.Text = bundled.Count > 0
                    ? string.Join("\n", bundled) + $"\n\n({bundled.Count} track{(bundled.Count == 1 ? "" : "s")})"
                    : "(none — add CSV files to the trackmaps folder)";

                var local = _plugin.GetLocalOnlyTrackIds();
                LocalTracksList.Text = local.Count > 0
                    ? string.Join("\n", local) + $"\n\n({local.Count} track{(local.Count == 1 ? "" : "s")})"
                    : "(none)";

                ExportTracksBtn.IsEnabled = local.Count > 0;
            }
            catch (Exception ex)
            {
                BundledTracksList.Text = $"Error: {ex.Message}";
                LocalTracksList.Text = $"Error: {ex.Message}";
            }
        }

        private void RefreshTracks_Click(object sender, RoutedEventArgs e)
        {
            RefreshTrackLists();
            ExportStatusLabel.Text = "";
        }

        private void ExportTracks_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Copy recorded tracks directly to the trackmaps folder
                var searchPaths = _plugin.GetTrackMapSearchPaths();
                string destDir = null;
                // Use the first existing trackmaps dir, or the primary path
                foreach (var p in searchPaths)
                {
                    // Skip the cache dir (last entry) — we want to copy TO the trackmaps folder
                    if (p.Contains("PluginsData")) continue;
                    if (Directory.Exists(p)) { destDir = p; break; }
                }
                if (destDir == null && searchPaths.Count > 0) destDir = searchPaths[0];

                if (string.IsNullOrEmpty(destDir))
                {
                    ExportStatusLabel.Text = "Could not determine trackmaps folder.";
                    return;
                }

                int count = _plugin.ExportLocalMapsTo(destDir);
                ExportStatusLabel.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(0x6f, 0xcf, 0x6f));
                ExportStatusLabel.Text = count > 0
                    ? $"Copied {count} track map{(count == 1 ? "" : "s")} to {destDir}"
                    : "No new tracks to copy.";
                RefreshTrackLists();
            }
            catch (Exception ex)
            {
                ExportStatusLabel.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(0xcf, 0x6f, 0x6f));
                ExportStatusLabel.Text = $"Export failed: {ex.Message}";
            }
        }

        private void OpenTrackmapsFolder_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var searchPaths = _plugin.GetTrackMapSearchPaths();
                string openPath = null;
                foreach (var p in searchPaths)
                {
                    if (p.Contains("PluginsData")) continue;
                    if (Directory.Exists(p)) { openPath = p; break; }
                }
                if (openPath == null && searchPaths.Count > 0)
                {
                    openPath = searchPaths[0];
                    Directory.CreateDirectory(openPath);
                }
                if (!string.IsNullOrEmpty(openPath))
                    Process.Start("explorer.exe", openPath);
            }
            catch (Exception ex)
            {
                ExportStatusLabel.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(0xcf, 0x6f, 0x6f));
                ExportStatusLabel.Text = $"Failed to open folder: {ex.Message}";
            }
        }

        // ── Update UI ────────────────────────────────────────────

        private async void CheckUpdate_Click(object sender, RoutedEventArgs e)
        {
            CheckUpdateBtn.IsEnabled = false;
            CheckUpdateBtn.Content = "Checking…";
            await _updater.CheckForUpdateAsync();
            CheckUpdateBtn.IsEnabled = true;
            CheckUpdateBtn.Content = "Check for updates";
        }

        private async void InstallUpdate_Click(object sender, RoutedEventArgs e)
        {
            InstallUpdateBtn.IsEnabled = false;
            InstallUpdateBtn.Content = "Downloading…";
            UpdateProgress.Visibility = Visibility.Visible;
            await _updater.DownloadAndInstallAsync();
        }

        private void RefreshUpdateUI()
        {
            if (_updater.IsChecking)
            {
                UpdateStatusLabel.Text = "Checking for updates…";
                UpdateStatusLabel.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(0x99, 0x99, 0x99));
                return;
            }

            if (_updater.IsDownloading)
            {
                UpdateStatusLabel.Text = $"Downloading… {_updater.DownloadPercent}%";
                UpdateProgress.Value = _updater.DownloadPercent;
                return;
            }

            if (!string.IsNullOrEmpty(_updater.ErrorMessage))
            {
                UpdateStatusLabel.Text = _updater.ErrorMessage;
                UpdateStatusLabel.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(0xcf, 0x6f, 0x6f));
                UpdateProgress.Visibility = Visibility.Collapsed;
                InstallUpdateBtn.Visibility = Visibility.Collapsed;
                return;
            }

            if (_updater.UpdateAvailable)
            {
                UpdateStatusLabel.Text = $"v{_updater.LatestVersion} available!";
                UpdateStatusLabel.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(0x6f, 0xcf, 0x6f));
                InstallUpdateBtn.Visibility = Visibility.Visible;
                UpdateVersionLabel.Text = !string.IsNullOrEmpty(_updater.ReleaseNotes)
                    ? _updater.ReleaseNotes
                    : "";
            }
            else
            {
                UpdateStatusLabel.Text = $"v{_updater.CurrentVersion} — up to date";
                UpdateStatusLabel.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(0x99, 0x99, 0x99));
                InstallUpdateBtn.Visibility = Visibility.Collapsed;
                UpdateProgress.Visibility = Visibility.Collapsed;
                UpdateVersionLabel.Text = "";
            }
        }

        private void SaveAndApply()
        {
            _plugin.SaveCommonSettings("GeneralSettings", _plugin.Settings);
            _plugin.ApplySettings();
        }
    }
}
