using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Windows.Media;
using GameReaderCommon;
using K10MediaCoach.Plugin.Engine;
using SimHub.Plugins;

namespace K10MediaCoach.Plugin
{
    [PluginDescription("Displays real-time commentary prompts while sim racing, timed to telemetry events.")]
    [PluginAuthor("K10MediaCoach")]
    [PluginName("K10 Media Coach")]
    public class Plugin : IPlugin, IDataPlugin, IWPFSettingsV2
    {
        public Settings Settings { get; private set; }
        public PluginManager PluginManager { get; set; }

        public ImageSource PictureIcon => null;
        public string LeftMenuTitle => "K10 Media Coach";

        // Engine
        private readonly CommentaryEngine  _engine   = new CommentaryEngine();
        private readonly TelemetryRecorder _recorder = new TelemetryRecorder();
        private readonly TrackMapProvider  _trackMap = new TrackMapProvider();
        private FeedbackEngine _feedback;

        // Telemetry frames (current + previous for delta calculations)
        private TelemetrySnapshot _current  = new TelemetrySnapshot();
        private TelemetrySnapshot _previous = new TelemetrySnapshot();

        // Frame counter — we evaluate triggers every N frames to reduce CPU load
        // at 60fps, every 6 frames = ~100ms evaluation cadence
        private int _frameCount = 0;
        private const int EvalEveryNFrames = 6;

        // Track change detection — triggers map reload
        private string _lastTrackId = "";

        // HTTP state server — exposes plugin state on port 8889 for Homebridge
        private HttpListener _httpListener;
        private Thread _httpThread;

        // ── IWPFSettingsV2 ────────────────────────────────────────────────────

        private SettingsControl _settingsControl;
        public System.Windows.Controls.Control GetWPFSettingsControl(PluginManager pluginManager)
            => _settingsControl = new SettingsControl(this);

        // ── IDataPlugin ───────────────────────────────────────────────────────

        public void Init(PluginManager pluginManager)
        {
            SimHub.Logging.Current.Info("[K10MediaCoach] Initialising K10 Media Coach plugin");

            // Load settings
            Settings = this.ReadCommonSettings<Settings>("GeneralSettings", () => new Settings());

            // Initialise feedback engine
            string feedbackPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "SimHub", "PluginsData", "K10MediaCoach", "feedback.json");
            _feedback = new FeedbackEngine(feedbackPath);
            _engine.GetCooldownMultiplier = id => _feedback.GetMultiplier(id);

            ApplySettings();

            // Load topics dataset
            string topicsPath = ResolveTopicsPath();
            _engine.LoadTopics(topicsPath);

            // Load sentiments (for background colors)
            string sentimentsPath = ResolveDatasetFile("sentiments.json");
            _engine.LoadSentiments(sentimentsPath);

            // Load commentary fragments (for sentence composition)
            string fragmentsPath = ResolveDatasetFile("commentary_fragments.json");
            _engine.LoadFragments(fragmentsPath);

            // Initialise track map provider
            // Detect SimHub install dir from our own assembly location (we're in SimHub\Plugins\)
            string pluginDir = Path.GetDirectoryName(typeof(Plugin).Assembly.Location) ?? "";
            string simhubDir = Path.GetDirectoryName(pluginDir) ?? "";
            _trackMap.SetSimHubDirectory(simhubDir);

            // ── Register dashboard properties ─────────────────────────────────

            // The full commentary prompt text (or event exposition in event-only mode)
            this.AttachDelegate("CommentaryText", () => BuildDisplayText());

            // Boolean: whether the panel should be visible
            this.AttachDelegate("CommentaryVisible", () => _engine.IsVisible ? 1 : 0);

            // Category with severity/sentiment label, e.g. "car_response — Urgent"
            this.AttachDelegate("CommentaryCategory", () =>
            {
                string cat = _engine.CurrentCategory;
                string label = _engine.CurrentSentimentLabel;
                return string.IsNullOrEmpty(label) ? cat : cat + " — " + label;
            });

            // Track position: sector + lap distance percentage
            this.AttachDelegate("CommentaryTrackPosition", () =>
            {
                if (!_current.GameRunning) return "";
                int pct = (int)Math.Round(_current.TrackPositionPct * 100);
                return $"Lap {_current.CurrentLap} · {pct}%";
            });

            // Short topic title
            this.AttachDelegate("CommentaryTopicTitle", () => _engine.CurrentTitle);

            // Seconds remaining until auto-clear (integer for clean display)
            this.AttachDelegate("CommentarySecondsRemaining", () => (int)Math.Round(_engine.SecondsRemaining));

            // Overlay color: category determines hue, severity determines opacity (#AARRGGBB)
            this.AttachDelegate("CommentarySentimentColor", () => _engine.CurrentSentimentColor);

            // WCAG-compliant text color — same shade as overlay, bright for readability (#AARRGGBB)
            this.AttachDelegate("CommentaryTextColor", () => _engine.CurrentTextColor);

            // Severity level (1-5) for the current prompt, 0 when no prompt visible.
            // Dashboard uses this to toggle per-severity background elements.
            this.AttachDelegate("CommentarySeverity", () => _engine.IsVisible ? _engine.CurrentSeverity : 0);

            // Flag state for Homebridge and dashboard — priority order, most urgent first.
            // All iRacing flags are now exposed so lights respond correctly.
            this.AttachDelegate("CurrentFlagState", () =>
            {
                if (!_current.GameRunning) return "none";
                int f = _current.SessionFlags;
                if ((f & TelemetrySnapshot.FLAG_RED)       != 0) return "red";
                if ((f & TelemetrySnapshot.FLAG_BLACK)     != 0) return "black";
                if ((f & TelemetrySnapshot.FLAG_YELLOW)    != 0) return "yellow";
                if ((f & TelemetrySnapshot.FLAG_BLUE)      != 0) return "blue";
                if ((f & TelemetrySnapshot.FLAG_DEBRIS)    != 0) return "debris";
                if ((f & TelemetrySnapshot.FLAG_WHITE)     != 0) return "white";
                if ((f & TelemetrySnapshot.FLAG_CHECKERED) != 0) return "checkered";
                if ((f & TelemetrySnapshot.FLAG_GREEN)     != 0) return "green";
                return "none";
            });

            // ── Demo mode flag — dashboard reads this to swap data sources ─────
            this.AttachDelegate("DemoMode", () => Settings.DemoMode ? 1 : 0);

            // ── Demo telemetry properties — populated by DemoTelemetryProvider ──
            // When DemoMode == 1, the dashboard reads these instead of GameData
            var dt = _engine.DemoTelemetry; // shorthand

            this.AttachDelegate("Demo.Gear",       () => dt.Gear);
            this.AttachDelegate("Demo.Rpm",        () => dt.Rpm);
            this.AttachDelegate("Demo.MaxRpm",     () => dt.MaxRpm);
            this.AttachDelegate("Demo.SpeedMph",   () => dt.SpeedMph);
            this.AttachDelegate("Demo.Throttle",   () => dt.Throttle * 100); // 0-100 to match SimHub GameData
            this.AttachDelegate("Demo.Brake",      () => dt.Brake * 100);
            this.AttachDelegate("Demo.Clutch",     () => dt.Clutch * 100);
            this.AttachDelegate("Demo.Fuel",       () => dt.Fuel);
            this.AttachDelegate("Demo.MaxFuel",    () => dt.MaxFuel);
            this.AttachDelegate("Demo.FuelPerLap", () => dt.FuelPerLap);
            this.AttachDelegate("Demo.RemainingLaps", () => dt.RemainingLaps);
            this.AttachDelegate("Demo.TyreTempFL", () => dt.TyreTempFL);
            this.AttachDelegate("Demo.TyreTempFR", () => dt.TyreTempFR);
            this.AttachDelegate("Demo.TyreTempRL", () => dt.TyreTempRL);
            this.AttachDelegate("Demo.TyreTempRR", () => dt.TyreTempRR);
            this.AttachDelegate("Demo.TyreWearFL", () => dt.TyreWearFL);
            this.AttachDelegate("Demo.TyreWearFR", () => dt.TyreWearFR);
            this.AttachDelegate("Demo.TyreWearRL", () => dt.TyreWearRL);
            this.AttachDelegate("Demo.TyreWearRR", () => dt.TyreWearRR);
            this.AttachDelegate("Demo.BrakeBias",  () => dt.BrakeBias);
            this.AttachDelegate("Demo.TC",         () => dt.TC);
            this.AttachDelegate("Demo.ABS",        () => dt.ABS);
            this.AttachDelegate("Demo.Position",   () => dt.Position);
            this.AttachDelegate("Demo.CurrentLap", () => dt.CurrentLap);
            this.AttachDelegate("Demo.BestLapTime",() => dt.BestLapTime);
            this.AttachDelegate("Demo.CarModel",   () => dt.CarModel);
            this.AttachDelegate("Demo.IRating",    () => dt.IRating);
            this.AttachDelegate("Demo.SafetyRating",() => dt.SafetyRating);
            this.AttachDelegate("Demo.GapAhead",   () => dt.GapAhead);
            this.AttachDelegate("Demo.GapBehind",  () => dt.GapBehind);
            this.AttachDelegate("Demo.DriverAhead", () => dt.DriverAhead);
            this.AttachDelegate("Demo.DriverBehind",() => dt.DriverBehind);
            this.AttachDelegate("Demo.IRAhead",    () => dt.IRAhead);
            this.AttachDelegate("Demo.IRBehind",   () => dt.IRBehind);

            // ── Track map properties — SVG path + car positions ────────────────
            this.AttachDelegate("TrackMap.Ready",      () => _trackMap.IsReady ? 1 : 0);
            this.AttachDelegate("TrackMap.SvgPath",    () => _trackMap.SvgPath);
            this.AttachDelegate("TrackMap.PlayerX",    () => _trackMap.PlayerX);
            this.AttachDelegate("TrackMap.PlayerY",    () => _trackMap.PlayerY);
            this.AttachDelegate("TrackMap.Opponents",  () => _trackMap.OpponentData);
            this.AttachDelegate("TrackMap.OpponentCount", () => _trackMap.OpponentCount);

            // Nearest car distance fraction for proximity-based lighting
            this.AttachDelegate("NearestCarDistance", () =>
            {
                if (!_current.GameRunning || _current.CarIdxLapDistPct == null || _current.CarIdxLapDistPct.Length == 0)
                    return 1.0;
                double playerPos = _current.TrackPositionPct;
                int playerIdx = _current.PlayerCarIdx;
                double minDist = 1.0;
                for (int i = 0; i < _current.CarIdxLapDistPct.Length; i++)
                {
                    if (i == playerIdx) continue;
                    double otherPos = _current.CarIdxLapDistPct[i];
                    if (otherPos <= 0) continue;
                    double delta = Math.Abs(playerPos - otherPos);
                    delta = Math.Min(delta, 1.0 - delta);
                    if (delta < minDist) minDist = delta;
                }
                return minDist;
            });

            // ── Actions ───────────────────────────────────────────────────────

            // Manually dismiss the current prompt
            this.AddAction("DismissPrompt", (a, b) =>
            {
                _engine.ClearPrompt();
                SimHub.Logging.Current.Info("[K10MediaCoach] Prompt dismissed by user action");
            });

            // Feedback actions — bind to a button box or SimHub Control Mapper
            this.AddAction("ThumbsUp", (a, b) =>
            {
                _feedback.Record(_engine.CurrentTopicId, _engine.CurrentText, +1);
                SimHub.Logging.Current.Info($"[K10MediaCoach] ThumbsUp: {_engine.CurrentTopicId}");
            });

            this.AddAction("ThumbsDown", (a, b) =>
            {
                _feedback.Record(_engine.CurrentTopicId, _engine.CurrentText, -1);
                SimHub.Logging.Current.Info($"[K10MediaCoach] ThumbsDown: {_engine.CurrentTopicId}");
            });

            // Recording toggle actions
            this.AddAction("StartRecording", (a, b) =>
            {
                Settings.RecordMode = true;
                ApplySettings();
            });

            this.AddAction("StopRecording", (a, b) =>
            {
                Settings.RecordMode = false;
                ApplySettings();
            });

            // ── Events ────────────────────────────────────────────────────────
            this.AddEvent("NewCommentaryPrompt");

            // Show a brief placeholder so the dashboard is visible before any game starts
            _engine.ShowDemoPrompt();

            // Start local HTTP server for Homebridge integration
            StartHttpServer();

            SimHub.Logging.Current.Info("[K10MediaCoach] Initialisation complete");
        }

        public void DataUpdate(PluginManager pluginManager, ref GameData data)
        {
            // Capture current telemetry every frame (cheap snapshot)
            _previous = _current;
            _current  = TelemetrySnapshot.Capture(pluginManager, ref data);

            // Detect track changes — reload map when track ID changes
            if (_current.GameRunning)
            {
                string trackId = GetTrackId(pluginManager);
                if (!string.IsNullOrEmpty(trackId) && trackId != _lastTrackId)
                {
                    _lastTrackId = trackId;
                    _trackMap.OnTrackChanged(trackId);
                }

                // Feed velocity + car positions to the track map provider every frame
                // (recording needs high sample rate; interpolation is cheap)
                _trackMap.Update(
                    _current.VelocityX, _current.VelocityZ,
                    _current.TrackPositionPct,
                    _current.CarIdxLapDistPct,
                    _current.CarIdxOnPitRoad,
                    _current.PlayerCarIdx,
                    _current.Position);
            }

            // Only run commentary evaluation every N frames
            _frameCount++;
            if (_frameCount < EvalEveryNFrames) return;
            _frameCount = 0;

            // Update demo track map if in demo mode
            if (Settings.DemoMode)
            {
                var dt = _engine.DemoTelemetry;
                _trackMap.UpdateDemo(dt.TrackPosition, 19, dt.Elapsed); // 19 opponents = 20 car field
            }

            bool wasVisible = _engine.IsVisible;
            _engine.Update(_current, _previous);

            // Write telemetry frame to recording if active
            if (_recorder.IsRecording)
                _recorder.Write(_current);

            // Fire event when a new prompt appears
            if (_engine.IsVisible && !wasVisible)
                this.TriggerEvent("NewCommentaryPrompt");
        }

        public void End(PluginManager pluginManager)
        {
            StopHttpServer();
            _recorder.StopRecording();
            this.SaveCommonSettings("GeneralSettings", Settings);
            SimHub.Logging.Current.Info("[K10MediaCoach] Plugin stopped, settings saved");
        }

        // ── Internal helpers ──────────────────────────────────────────────────

        public void ApplySettings()
        {
            _engine.DisplaySeconds    = Settings.PromptDisplaySeconds;
            _engine.EventOnlyMode     = Settings.EventOnlyMode;
            _engine.DemoMode          = Settings.DemoMode;
            _trackMap.SetDemoMode(Settings.DemoMode);
            _engine.EnabledCategories = Settings.EnabledCategories?.Count > 0
                ? new System.Collections.Generic.HashSet<string>(Settings.EnabledCategories)
                : null;

            if (Settings.RecordMode && !_recorder.IsRecording)
            {
                string dir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                    "SimHub", "PluginsData", "K10MediaCoach", "recordings");
                _recorder.StartRecording(dir);
            }
            else if (!Settings.RecordMode && _recorder.IsRecording)
            {
                _recorder.StopRecording();
            }
        }

        private string BuildDisplayText()
        {
            if (!_engine.IsVisible) return "";

            // Event-only mode: show concise exposition instead of commentary prompt
            if (Settings.EventOnlyMode)
            {
                string expo = _engine.CurrentEventExposition;
                return string.IsNullOrEmpty(expo)
                    ? _engine.CurrentTitle
                    : expo;
            }

            if (Settings.ShowTopicTitle && !string.IsNullOrEmpty(_engine.CurrentTitle))
                return _engine.CurrentTitle + "\n" + _engine.CurrentText;
            return _engine.CurrentText;
        }

        private string GetTrackId(PluginManager pm)
        {
            try
            {
                // iRacing: SessionInfo contains track name
                var val = pm.GetPropertyValue("DataCorePlugin.GameData.TrackName")
                       ?? pm.GetPropertyValue("DataCorePlugin.GameData.TrackId");
                if (val != null)
                {
                    string id = val.ToString().Trim();
                    if (!string.IsNullOrEmpty(id)) return id;
                }
            }
            catch { }
            return _current.GameName ?? "";
        }

        private void StartHttpServer()
        {
            // Try binding in order of preference:
            // 1. Wildcard (*) — works if SimHub runs as admin or URL ACL is registered
            // 2. localhost only — always works without admin, sufficient for local overlays
            string[] prefixes = new[]
            {
                "http://*:8889/k10mediacoach/",
                "http://localhost:8889/k10mediacoach/"
            };

            foreach (var prefix in prefixes)
            {
                try
                {
                    _httpListener = new HttpListener();
                    _httpListener.Prefixes.Add(prefix);
                    _httpListener.Start();
                    _httpThread = new Thread(HttpServerLoop) { IsBackground = true, Name = "K10MediaCoach-HTTP" };
                    _httpThread.Start();
                    SimHub.Logging.Current.Info($"[K10MediaCoach] HTTP state server listening on port 8889 (prefix: {prefix})");
                    return;
                }
                catch (Exception ex)
                {
                    SimHub.Logging.Current.Warn($"[K10MediaCoach] HTTP server failed with prefix {prefix}: {ex.Message}");
                    try { _httpListener?.Close(); } catch { }
                    _httpListener = null;
                }
            }

            SimHub.Logging.Current.Warn("[K10MediaCoach] HTTP server could not start on any prefix — dashboard overlay will not receive data");
        }

        private void StopHttpServer()
        {
            try { _httpListener?.Stop(); } catch { }
        }

        private void HttpServerLoop()
        {
            var ic = System.Globalization.CultureInfo.InvariantCulture;

            while (_httpListener != null && _httpListener.IsListening)
            {
                HttpListenerContext ctx;
                try { ctx = _httpListener.GetContext(); }
                catch { break; }

                try
                {
                    // Handle CORS preflight
                    if (ctx.Request.HttpMethod == "OPTIONS")
                    {
                        ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                        ctx.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                        ctx.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
                        ctx.Response.StatusCode = 204;
                        ctx.Response.OutputStream.Close();
                        continue;
                    }

                    // ── Build complete state snapshot ────────────────────────
                    var s = _current; // snapshot reference (safe — replaced atomically in DataUpdate)
                    var dt = _engine.DemoTelemetry;
                    bool demo = Settings.DemoMode;

                    // Flag state
                    string flagState = "none";
                    if (s.GameRunning)
                    {
                        int f = s.SessionFlags;
                        if      ((f & TelemetrySnapshot.FLAG_RED)       != 0) flagState = "red";
                        else if ((f & TelemetrySnapshot.FLAG_BLACK)     != 0) flagState = "black";
                        else if ((f & TelemetrySnapshot.FLAG_YELLOW)    != 0) flagState = "yellow";
                        else if ((f & TelemetrySnapshot.FLAG_BLUE)      != 0) flagState = "blue";
                        else if ((f & TelemetrySnapshot.FLAG_DEBRIS)    != 0) flagState = "debris";
                        else if ((f & TelemetrySnapshot.FLAG_WHITE)     != 0) flagState = "white";
                        else if ((f & TelemetrySnapshot.FLAG_CHECKERED) != 0) flagState = "checkered";
                        else if ((f & TelemetrySnapshot.FLAG_GREEN)     != 0) flagState = "green";
                    }

                    // Nearest car distance
                    double nearestDist = 1.0;
                    if (s.GameRunning && s.CarIdxLapDistPct != null && s.CarIdxLapDistPct.Length > 0)
                    {
                        double playerPos = s.TrackPositionPct;
                        int playerIdx = s.PlayerCarIdx;
                        for (int i = 0; i < s.CarIdxLapDistPct.Length; i++)
                        {
                            if (i == playerIdx) continue;
                            double other = s.CarIdxLapDistPct[i];
                            if (other <= 0) continue;
                            double d = Math.Abs(playerPos - other);
                            d = Math.Min(d, 1.0 - d);
                            if (d < nearestDist) nearestDist = d;
                        }
                    }

                    // Commentary state
                    string cat = _engine.CurrentCategory ?? "";
                    string label = _engine.CurrentSentimentLabel ?? "";
                    string category = string.IsNullOrEmpty(label) ? cat : cat + " \u2014 " + label;

                    // Build JSON — flat key-value map matching PROP_KEYS the dashboard expects
                    var sb = new StringBuilder(2048);
                    sb.Append("{\n");

                    // ── Game data (live telemetry from snapshot) ──
                    Jp(sb, "DataCorePlugin.GameRunning", s.GameRunning ? 1 : 0);
                    Jp(sb, "DataCorePlugin.GameData.Gear", Escape(s.Gear ?? "N"));
                    Jp(sb, "DataCorePlugin.GameData.Rpms", s.Rpms, ic);
                    Jp(sb, "DataCorePlugin.GameData.CarSettings_MaxRPM", 8000.0, ic); // fallback; snapshot doesn't carry maxRPM
                    Jp(sb, "DataCorePlugin.GameData.SpeedMph", s.SpeedKmh * 0.621371, ic);
                    Jp(sb, "DataCorePlugin.GameData.Throttle", s.Throttle * 100, ic);
                    Jp(sb, "DataCorePlugin.GameData.Brake", s.Brake * 100, ic);
                    Jp(sb, "DataCorePlugin.GameData.Clutch", 0.0, ic); // not in snapshot currently
                    Jp(sb, "DataCorePlugin.GameData.Fuel", s.FuelLevel, ic);
                    Jp(sb, "DataCorePlugin.GameData.MaxFuel", s.FuelLevel > 0 ? s.FuelLevel / Math.Max(s.FuelPercent, 0.01) : 0, ic);
                    Jp(sb, "DataCorePlugin.Computed.Fuel_LitersPerLap", 0.0, ic);
                    Jp(sb, "DataCorePlugin.GameData.RemainingLaps", 0.0, ic);
                    Jp(sb, "DataCorePlugin.GameData.TyreTempFrontLeft", s.TyreTempFL, ic);
                    Jp(sb, "DataCorePlugin.GameData.TyreTempFrontRight", s.TyreTempFR, ic);
                    Jp(sb, "DataCorePlugin.GameData.TyreTempRearLeft", s.TyreTempRL, ic);
                    Jp(sb, "DataCorePlugin.GameData.TyreTempRearRight", s.TyreTempRR, ic);
                    Jp(sb, "DataCorePlugin.GameData.TyreWearFrontLeft", s.TyreWearFL, ic);
                    Jp(sb, "DataCorePlugin.GameData.TyreWearFrontRight", s.TyreWearFR, ic);
                    Jp(sb, "DataCorePlugin.GameData.TyreWearRearLeft", s.TyreWearRL, ic);
                    Jp(sb, "DataCorePlugin.GameData.TyreWearRearRight", s.TyreWearRR, ic);
                    Jp(sb, "DataCorePlugin.GameRawData.Telemetry.dcBrakeBias", 0.0, ic);
                    Jp(sb, "DataCorePlugin.GameRawData.Telemetry.dcTractionControl", 0.0, ic);
                    Jp(sb, "DataCorePlugin.GameRawData.Telemetry.dcABS", 0.0, ic);
                    Jp(sb, "DataCorePlugin.GameData.Position", s.Position);
                    Jp(sb, "DataCorePlugin.GameData.CurrentLap", s.CurrentLap);
                    Jp(sb, "DataCorePlugin.GameData.BestLapTime", s.LapBestTime, ic);
                    Jp(sb, "DataCorePlugin.GameData.CarModel", Escape(s.CarModel ?? ""));
                    Jp(sb, "IRacingExtraProperties.iRacing_DriverInfo_IRating", 0);
                    Jp(sb, "IRacingExtraProperties.iRacing_DriverInfo_SafetyRating", 0.0, ic);
                    Jp(sb, "IRacingExtraProperties.iRacing_Opponent_Ahead_Gap", 0.0, ic);
                    Jp(sb, "IRacingExtraProperties.iRacing_Opponent_Behind_Gap", 0.0, ic);
                    Jp(sb, "IRacingExtraProperties.iRacing_Opponent_Ahead_Name", Escape(s.NearestAheadName ?? ""));
                    Jp(sb, "IRacingExtraProperties.iRacing_Opponent_Behind_Name", Escape(s.NearestBehindName ?? ""));
                    Jp(sb, "IRacingExtraProperties.iRacing_Opponent_Ahead_IRating", s.NearestAheadRating);
                    Jp(sb, "IRacingExtraProperties.iRacing_Opponent_Behind_IRating", s.NearestBehindRating);

                    // ── Commentary ──
                    Jp(sb, "K10MediaCoach.Plugin.CommentaryVisible", _engine.IsVisible ? 1 : 0);
                    Jp(sb, "K10MediaCoach.Plugin.CommentaryText", Escape(_engine.CurrentText ?? ""));
                    Jp(sb, "K10MediaCoach.Plugin.CommentaryTopicTitle", Escape(_engine.CurrentTitle ?? ""));
                    Jp(sb, "K10MediaCoach.Plugin.CommentaryCategory", Escape(category));
                    Jp(sb, "K10MediaCoach.Plugin.CommentarySentimentColor", Escape(_engine.CurrentSentimentColor ?? "#FF000000"));
                    Jp(sb, "K10MediaCoach.Plugin.CommentarySeverity", _engine.IsVisible ? _engine.CurrentSeverity : 0);

                    // ── Demo mode ──
                    Jp(sb, "K10MediaCoach.Plugin.DemoMode", demo ? 1 : 0);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.Gear", Escape(dt.Gear ?? "N"));
                    Jp(sb, "K10MediaCoach.Plugin.Demo.Rpm", dt.Rpm, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.MaxRpm", dt.MaxRpm, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.SpeedMph", dt.SpeedMph, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.Throttle", dt.Throttle * 100, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.Brake", dt.Brake * 100, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.Clutch", dt.Clutch * 100, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.Fuel", dt.Fuel, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.MaxFuel", dt.MaxFuel, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.FuelPerLap", dt.FuelPerLap, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.RemainingLaps", dt.RemainingLaps, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.TyreTempFL", dt.TyreTempFL, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.TyreTempFR", dt.TyreTempFR, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.TyreTempRL", dt.TyreTempRL, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.TyreTempRR", dt.TyreTempRR, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.TyreWearFL", dt.TyreWearFL, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.TyreWearFR", dt.TyreWearFR, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.TyreWearRL", dt.TyreWearRL, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.TyreWearRR", dt.TyreWearRR, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.BrakeBias", dt.BrakeBias, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.TC", dt.TC, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.ABS", dt.ABS, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.Position", dt.Position);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.CurrentLap", dt.CurrentLap);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.BestLapTime", dt.BestLapTime, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.CarModel", Escape(dt.CarModel ?? ""));
                    Jp(sb, "K10MediaCoach.Plugin.Demo.IRating", dt.IRating);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.SafetyRating", dt.SafetyRating, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.GapAhead", dt.GapAhead, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.GapBehind", dt.GapBehind, ic);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.DriverAhead", Escape(dt.DriverAhead ?? ""));
                    Jp(sb, "K10MediaCoach.Plugin.Demo.DriverBehind", Escape(dt.DriverBehind ?? ""));
                    Jp(sb, "K10MediaCoach.Plugin.Demo.IRAhead", dt.IRAhead);
                    Jp(sb, "K10MediaCoach.Plugin.Demo.IRBehind", dt.IRBehind);

                    // ── Track map ──
                    Jp(sb, "K10MediaCoach.Plugin.TrackMap.Ready", _trackMap.IsReady ? 1 : 0);
                    Jp(sb, "K10MediaCoach.Plugin.TrackMap.SvgPath", Escape(_trackMap.SvgPath ?? ""));
                    Jp(sb, "K10MediaCoach.Plugin.TrackMap.PlayerX", _trackMap.PlayerX, ic);
                    Jp(sb, "K10MediaCoach.Plugin.TrackMap.PlayerY", _trackMap.PlayerY, ic);
                    Jp(sb, "K10MediaCoach.Plugin.TrackMap.Opponents", Escape(_trackMap.OpponentData ?? ""));

                    // ── Extra (homebridge / legacy) ──
                    Jp(sb, "currentFlagState", Escape(flagState));
                    Jp(sb, "nearestCarDistance", nearestDist, ic);

                    // Remove trailing comma and close
                    if (sb.Length > 2 && sb[sb.Length - 2] == ',')
                        sb.Remove(sb.Length - 2, 1); // remove last comma
                    sb.Append("}");

                    byte[] buf = Encoding.UTF8.GetBytes(sb.ToString());
                    ctx.Response.ContentType     = "application/json";
                    ctx.Response.ContentLength64 = buf.Length;
                    ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                    ctx.Response.OutputStream.Write(buf, 0, buf.Length);
                }
                catch (Exception ex)
                {
                    SimHub.Logging.Current.Warn($"[K10MediaCoach] HTTP handler error: {ex.Message}");
                }
                finally
                {
                    try { ctx.Response.OutputStream.Close(); } catch { }
                }
            }
        }

        // JSON property helpers — avoid pulling in Newtonsoft for a simple flat map
        private static void Jp(StringBuilder sb, string key, int val)
            => sb.Append($"  \"{key}\": {val},\n");
        private static void Jp(StringBuilder sb, string key, double val, System.Globalization.CultureInfo ic)
            => sb.Append($"  \"{key}\": {val.ToString("G", ic)},\n");
        private static void Jp(StringBuilder sb, string key, string val)
            => sb.Append($"  \"{key}\": \"{val}\",\n");

        private static string Escape(string s) =>
            s?.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "") ?? "";

        private string ResolveTopicsPath()
        {
            if (!string.IsNullOrEmpty(Settings.TopicsFilePath) && File.Exists(Settings.TopicsFilePath))
                return Settings.TopicsFilePath;
            return ResolveDatasetFile("commentary_topics.json");
        }

        private string ResolveDatasetFile(string filename)
        {
            string dllDir = Path.GetDirectoryName(typeof(Plugin).Assembly.Location) ?? "";
            string candidate = Path.Combine(dllDir, "dataset", filename);
            if (File.Exists(candidate)) return candidate;

            string pluginsData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "SimHub", "PluginsData", "K10MediaCoach", filename);
            if (File.Exists(pluginsData)) return pluginsData;

            SimHub.Logging.Current.Warn($"[K10MediaCoach] {filename} not found in dataset folder");
            return "";
        }
    }
}
