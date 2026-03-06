using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using MediaCoach.Plugin.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace MediaCoach.Plugin.Engine
{
    /// <summary>
    /// Core commentary logic. Evaluates telemetry triggers, enforces cooldowns,
    /// selects prompts, and manages the display lifecycle.
    /// </summary>
    public class CommentaryEngine
    {
        // ── Sentiment → category mapping ──────────────────────────────────────
        private static readonly Dictionary<string, string[]> CategorySentiments =
            new Dictionary<string, string[]>
            {
                { "hardware",          new[] { "technical_analytical", "car_praise" } },
                { "game_feel",         new[] { "sim_comparison", "technical_analytical" } },
                { "car_response",      new[] { "excitement_positive", "frustration_negative", "technical_analytical" } },
                { "racing_experience", new[] { "neutral_narrative", "excitement_positive", "frustration_negative", "self_deprecating" } },
            };

        // ── State ─────────────────────────────────────────────────────────────
        private List<CommentaryTopic> _topics = new List<CommentaryTopic>();
        private Dictionary<string, string> _sentimentColors = new Dictionary<string, string>();
        private readonly Random _rng = new Random();

        // Per-topic last trigger time
        private readonly Dictionary<string, DateTime> _topicLastTrigger = new Dictionary<string, DateTime>();
        // Anti-spam: minimum 10 seconds between any two prompts
        private DateTime _lastPromptFireTime = DateTime.MinValue;

        // Current displayed prompt
        private volatile string _currentText           = "";
        private volatile string _currentCategory       = "";
        private volatile string _currentTitle          = "";
        private volatile string _currentTopicId        = "";
        private volatile string _currentSentimentColor = "#FF000000";
        private DateTime _promptDisplayedAt             = DateTime.MinValue;

        // ── Settings (set by plugin from Settings object) ─────────────────────
        public double DisplaySeconds      { get; set; } = 30.0;
        public HashSet<string> EnabledCategories { get; set; }

        /// <summary>
        /// Optional hook — returns a cooldown multiplier for a given topic ID.
        /// Supplied by the plugin from FeedbackEngine. Default: no adjustment.
        /// </summary>
        public Func<string, double> GetCooldownMultiplier { get; set; } = _ => 1.0;

        // ── Public state (read by plugin, passed to dashboard) ───────────────
        public string CurrentText           => _currentText;
        public string CurrentCategory       => _currentCategory;
        public string CurrentTitle          => _currentTitle;
        public string CurrentTopicId        => _currentTopicId;
        public string CurrentSentimentColor => _currentSentimentColor;
        public bool   IsVisible       => _currentText.Length > 0
                                         && (DateTime.UtcNow - _promptDisplayedAt).TotalSeconds < DisplaySeconds;
        public double SecondsRemaining
        {
            get
            {
                double elapsed = (DateTime.UtcNow - _promptDisplayedAt).TotalSeconds;
                return Math.Max(0, DisplaySeconds - elapsed);
            }
        }

        // ── Initialise ────────────────────────────────────────────────────────

        /// <summary>
        /// Shows a brief placeholder prompt so the dashboard is visible on startup
        /// before any game session begins. Auto-clears after DisplaySeconds.
        /// </summary>
        public void ShowDemoPrompt()
        {
            _currentText           = "Media Coach is active. Prompts will appear here when telemetry events fire during your session.";
            _currentCategory       = "hardware";
            _currentTitle          = "Media Coach Ready";
            _currentSentimentColor = "#FF263238"; // neutral dark slate
            _promptDisplayedAt     = DateTime.UtcNow;
        }

        public void LoadTopics(string jsonPath)
        {
            if (!File.Exists(jsonPath))
            {
                SimHub.Logging.Current.Warn($"[MediaCoach] Topics file not found: {jsonPath}");
                LoadBuiltinTopics();
                return;
            }

            try
            {
                string json = File.ReadAllText(jsonPath);
                var file = JsonConvert.DeserializeObject<CommentaryTopicsFile>(json);
                _topics = file?.Topics ?? new List<CommentaryTopic>();
                SimHub.Logging.Current.Info($"[MediaCoach] Loaded {_topics.Count} topics from {jsonPath}");
            }
            catch (Exception ex)
            {
                SimHub.Logging.Current.Error($"[MediaCoach] Failed to load topics: {ex.Message}");
                LoadBuiltinTopics();
            }
        }

        public void LoadSentiments(string jsonPath)
        {
            if (!File.Exists(jsonPath))
            {
                SimHub.Logging.Current.Warn($"[MediaCoach] Sentiments file not found: {jsonPath}");
                return;
            }

            try
            {
                string json = File.ReadAllText(jsonPath);
                var settings = new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                };
                var file = JsonConvert.DeserializeObject<SentimentsFile>(json, settings);
                if (file?.Sentiments != null)
                {
                    _sentimentColors.Clear();
                    foreach (var s in file.Sentiments)
                        if (!string.IsNullOrEmpty(s.Id) && !string.IsNullOrEmpty(s.Color))
                            _sentimentColors[s.Id] = s.Color;
                }
                SimHub.Logging.Current.Info($"[MediaCoach] Loaded {_sentimentColors.Count} sentiment colors");
            }
            catch (Exception ex)
            {
                SimHub.Logging.Current.Error($"[MediaCoach] Failed to load sentiments: {ex.Message}");
            }
        }

        private void LoadBuiltinTopics()
        {
            // Minimal fallback topics if JSON file is missing
            _topics = new List<CommentaryTopic>
            {
                new CommentaryTopic
                {
                    Id = "car_balance_fallback",
                    Category = "car_response",
                    Title = "Car Balance",
                    CommentaryPrompts = new List<string>
                    {
                        "Talk about how the car is feeling right now — is it balanced or fighting you?",
                        "What does the car need right now to go faster?"
                    },
                    Triggers = new List<TriggerCondition>
                    {
                        new TriggerCondition { DataPoint = "LatAccel", Condition = ">", Value = 2.5 }
                    },
                    CooldownMinutes = 2
                },
                new CommentaryTopic
                {
                    Id = "fuel_fallback",
                    Category = "racing_experience",
                    Title = "Fuel Strategy",
                    CommentaryPrompts = new List<string>
                    {
                        "Talk about your fuel situation — how many laps do you have left?"
                    },
                    Triggers = new List<TriggerCondition>
                    {
                        new TriggerCondition { DataPoint = "FuelPercent", Condition = "<", Value = 0.25 }
                    },
                    CooldownMinutes = 3
                }
            };
        }

        // ── Main update loop ──────────────────────────────────────────────────

        /// <summary>
        /// Called once per DataUpdate frame. Evaluates triggers and updates
        /// the current prompt if appropriate. Thread-safe via volatile writes.
        /// </summary>
        public void Update(TelemetrySnapshot current, TelemetrySnapshot previous)
        {
            // Auto-clear expired prompts
            if (!IsVisible && _currentText.Length > 0)
                ClearPrompt();

            if (!current.GameRunning) return;

            // Anti-spam: enforce 10-second minimum between any two prompts
            if ((DateTime.UtcNow - _lastPromptFireTime).TotalSeconds < 10.0) return;

            // Evaluate topics in randomised order to avoid always preferring the first match
            var shuffled = _topics.OrderBy(_ => _rng.Next()).ToList();

            foreach (var topic in shuffled)
            {
                if (!IsTopicEnabled(topic, current.SessionTypeName)) continue;
                if (!IsTopicCooledDown(topic)) continue;
                if (!AnyTriggerFires(topic, current, previous)) continue;

                ShowPrompt(topic);
                return; // one suggestion at a time
            }
        }

        public void ClearPrompt()
        {
            _currentText           = "";
            _currentCategory       = "";
            _currentTitle          = "";
            _currentTopicId        = "";
            _currentSentimentColor = "#FF000000";
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private bool IsTopicEnabled(CommentaryTopic topic, string sessionTypeName)
        {
            if (EnabledCategories != null && EnabledCategories.Count > 0)
                if (!EnabledCategories.Contains(topic.Category)) return false;

            // Session type filter: if topic specifies session types, enforce them
            if (topic.SessionTypes != null && topic.SessionTypes.Count > 0)
            {
                string sn = (sessionTypeName ?? "").ToLowerInvariant();
                bool matched = false;
                foreach (var st in topic.SessionTypes)
                {
                    if (sn.Contains(st.ToLowerInvariant())) { matched = true; break; }
                }
                if (!matched) return false;
            }

            return true;
        }

        private bool IsTopicCooledDown(CommentaryTopic topic)
        {
            if (!_topicLastTrigger.TryGetValue(topic.Id, out DateTime last))
                return true;
            double multiplier = GetCooldownMultiplier(topic.Id);
            return (DateTime.UtcNow - last).TotalMinutes >= topic.CooldownMinutes * multiplier;
        }

        private bool AnyTriggerFires(CommentaryTopic topic, TelemetrySnapshot cur, TelemetrySnapshot prev)
        {
            foreach (var trigger in topic.Triggers)
            {
                if (TriggerEvaluator.Evaluate(trigger, cur, prev))
                    return true;
            }
            return false;
        }

        private string PickSentimentColor(string category)
        {
            if (!CategorySentiments.TryGetValue(category ?? "", out var ids) || ids.Length == 0)
                return "#FF000000";
            string id = ids[_rng.Next(ids.Length)];
            return _sentimentColors.TryGetValue(id, out var color) ? color : "#FF000000";
        }

        private void ShowPrompt(CommentaryTopic topic)
        {
            if (topic.CommentaryPrompts == null || topic.CommentaryPrompts.Count == 0) return;

            string prompt = topic.CommentaryPrompts[_rng.Next(topic.CommentaryPrompts.Count)];

            // Use topic's explicit sentiment if set, otherwise fall back to category mapping
            string sentimentColor = !string.IsNullOrEmpty(topic.Sentiment)
                ? (_sentimentColors.TryGetValue(topic.Sentiment, out var c) ? c : "#FF000000")
                : PickSentimentColor(topic.Category);

            _currentText           = prompt;
            _currentCategory       = topic.Category;
            _currentTitle          = topic.Title;
            _currentTopicId        = topic.Id;
            _currentSentimentColor = sentimentColor;
            _promptDisplayedAt     = DateTime.UtcNow;

            _topicLastTrigger[topic.Id] = DateTime.UtcNow;
            _lastPromptFireTime = DateTime.UtcNow;

            SimHub.Logging.Current.Info($"[MediaCoach] Prompt shown: [{topic.Title}] {prompt}");
        }
    }
}
