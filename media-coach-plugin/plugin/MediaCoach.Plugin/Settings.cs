using System.Collections.Generic;

namespace MediaCoach.Plugin
{
    public class Settings
    {
        /// <summary>How long (seconds) each prompt stays on screen before auto-clearing.</summary>
        public double PromptDisplaySeconds { get; set; } = 30.0;

        /// <summary>
        /// Categories to include. Empty list = all categories enabled.
        /// Valid values: hardware, game_feel, car_response, racing_experience
        /// </summary>
        public List<string> EnabledCategories { get; set; } = new List<string>();

        /// <summary>Path to commentary_topics.json. Defaults to dataset subfolder next to DLL.</summary>
        public string TopicsFilePath { get; set; } = "";

        /// <summary>Whether to show the topic title above the prompt text.</summary>
        public bool ShowTopicTitle { get; set; } = true;

        /// <summary>When true, telemetry snapshots are written to a JSONL file for offline analysis.</summary>
        public bool RecordMode { get; set; } = false;
    }
}
