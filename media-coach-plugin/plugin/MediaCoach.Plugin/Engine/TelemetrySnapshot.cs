using GameReaderCommon;
using SimHub.Plugins;
using System;
using System.Reflection;

namespace MediaCoach.Plugin.Engine
{
    /// <summary>
    /// Captures a single frame of telemetry data for trigger evaluation.
    /// Holds both the current-frame and previous-frame values so triggers
    /// can detect changes, spikes, and threshold crossings.
    ///
    /// Data source priority:
    ///   1. iRacing raw telemetry (DataCorePlugin.GameRawData.Telemetry.*) — highest precision
    ///   2. SimHub normalized data (data.NewData reflection) — cross-game fallback
    ///   3. Default (0 / false) — field not available for this game
    /// </summary>
    public class TelemetrySnapshot
    {
        // ── Normalized (game-agnostic) ──────────────────────────────────────
        public bool   GameRunning       { get; set; }
        public string GameName          { get; set; }
        public double SpeedKmh          { get; set; }
        public double Rpms              { get; set; }
        public string Gear              { get; set; }
        public double Throttle          { get; set; }
        public double Brake             { get; set; }
        public double FuelLevel         { get; set; }
        public double FuelPercent       { get; set; }
        public int    CurrentLap        { get; set; }
        public int    CompletedLaps     { get; set; }
        public double TrackPositionPct  { get; set; }
        public int    Position          { get; set; }
        public bool   IsInPit           { get; set; }
        public bool   IsInPitLane       { get; set; }
        public string SessionTypeName   { get; set; }
        public double TyreWearFL        { get; set; }
        public double TyreWearFR        { get; set; }
        public double TyreWearRL        { get; set; }
        public double TyreWearRR        { get; set; }

        // ── Physics — iRacing raw, with cross-game normalized fallback ───────
        // Available: iRacing, AC, ACC, AMS2, LMU (via SimHub motion physics)
        public double LatAccel          { get; set; }
        public double LongAccel         { get; set; }
        public double VertAccel         { get; set; }
        public double YawRate           { get; set; }

        // ── Driver aids — cross-game where supported ─────────────────────────
        // AbsActive:  iRacing, AC, ACC, AMS2, LMU
        // TcActive:   AC, ACC, AMS2, LMU (iRacing exposes TC differently)
        public bool   AbsActive         { get; set; }
        public bool   TcActive          { get; set; }

        // ── Tyre temperatures — cross-game where supported ───────────────────
        // Available: AC, ACC, AMS2, LMU; partially in iRacing
        public double TyreTempFL        { get; set; }
        public double TyreTempFR        { get; set; }
        public double TyreTempRL        { get; set; }
        public double TyreTempRR        { get; set; }

        // ── Environment — cross-game where supported ─────────────────────────
        // TrackTemp:  iRacing, AC, ACC, AMS2, LMU
        // WeatherWet: iRacing (flag), AC/AMS2/LMU (RainIntensity > threshold)
        public double TrackTemp         { get; set; }
        public bool   WeatherWet        { get; set; }

        // ── Lap timing — iRacing raw, with cross-game normalized fallback ────
        // All fields available in most SimHub-supported games
        public double LapDeltaToBest    { get; set; }
        public double LapCurrentTime    { get; set; }
        public double LapLastTime       { get; set; }
        public double LapBestTime       { get; set; }
        public double SessionTimeRemain { get; set; }

        // ── iRacing-only ─────────────────────────────────────────────────────
        public double SteeringWheelTorque { get; set; } // torque (Nm), not angle
        public int    SessionFlags        { get; set; } // yellow/black/etc. bitmask
        public int    IncidentCount       { get; set; } // iRacing incident points
        public int    DrsStatus           { get; set; }
        public double ErsBattery          { get; set; }
        public double MgukPower           { get; set; }
        public float[] CarIdxLapDistPct   { get; set; } = new float[0];
        public bool[]  CarIdxOnPitRoad    { get; set; } = new bool[0];
        public int     PlayerCarIdx       { get; set; }

        // ── iRacing flag bitmasks ────────────────────────────────────────────
        public const int FLAG_YELLOW = 0x0008 | 0x4000 | 0x8000;
        public const int FLAG_BLACK  = 0x00010000;

        // ── Factory: capture current state from SimHub ───────────────────────
        public static TelemetrySnapshot Capture(PluginManager pm, ref GameData data)
        {
            var s = new TelemetrySnapshot();
            s.GameRunning = data.GameRunning;
            s.GameName    = data.GameName ?? "";

            if (!data.GameRunning || data.NewData == null)
                return s;

            var d = data.NewData;

            // ── Normalized fields (all games) ────────────────────────────────
            s.SpeedKmh         = d.SpeedKmh;
            s.Rpms             = d.Rpms;
            s.Gear             = d.Gear ?? "N";
            s.Throttle         = d.Throttle;
            s.Brake            = d.Brake;
            s.FuelLevel        = d.Fuel;
            s.FuelPercent      = d.FuelPercent;
            s.CurrentLap       = d.CurrentLap;
            s.CompletedLaps    = d.CompletedLaps;
            s.TrackPositionPct = d.TrackPositionPercent;
            s.Position         = d.Position;
            s.IsInPit          = d.IsInPit != 0;
            s.IsInPitLane      = d.IsInPitLane != 0;
            s.SessionTypeName  = d.SessionTypeName ?? "";
            s.TyreWearFL       = d.TyreWearFrontLeft;
            s.TyreWearFR       = d.TyreWearFrontRight;
            s.TyreWearRL       = d.TyreWearRearLeft;
            s.TyreWearRR       = d.TyreWearRearRight;

            // ── Physics: iRacing raw → normalized fallback ───────────────────
            s.LatAccel  = Coalesce(GetRaw<float>(pm, "LatAccel"),  GetNorm<float>(d, "AccelerationSway"));
            s.LongAccel = Coalesce(GetRaw<float>(pm, "LongAccel"), GetNorm<float>(d, "AccelerationSurge"));
            s.VertAccel = Coalesce(GetRaw<float>(pm, "VertAccel"), GetNorm<float>(d, "AccelerationHeave"));
            s.YawRate   = Coalesce(GetRaw<float>(pm, "YawRate"),   GetNorm<float>(d, "YawVelocity"));

            // ── Driver aids ──────────────────────────────────────────────────
            s.AbsActive = GetRaw<bool>(pm, "BrakeABSactive") || GetNorm<bool>(d, "ABSActive");
            s.TcActive  = GetNorm<bool>(d, "TCActive");

            // ── Tyre temps ───────────────────────────────────────────────────
            s.TyreTempFL = Coalesce(GetNorm<float>(d, "TyreTempFrontLeft"),  GetNorm<float>(d, "TyreTemperatureFrontLeft"));
            s.TyreTempFR = Coalesce(GetNorm<float>(d, "TyreTempFrontRight"), GetNorm<float>(d, "TyreTemperatureFrontRight"));
            s.TyreTempRL = Coalesce(GetNorm<float>(d, "TyreTempRearLeft"),   GetNorm<float>(d, "TyreTemperatureRearLeft"));
            s.TyreTempRR = Coalesce(GetNorm<float>(d, "TyreTempRearRight"),  GetNorm<float>(d, "TyreTemperatureRearRight"));

            // ── Environment ──────────────────────────────────────────────────
            s.TrackTemp  = Coalesce(GetRaw<float>(pm, "TrackTemp"), GetNorm<float>(d, "RoadTemperature"));
            bool iRacingWet = GetRaw<bool>(pm, "WeatherDeclaredWet");
            float rainIntensity = GetNorm<float>(d, "RainIntensity");
            s.WeatherWet = iRacingWet || rainIntensity > 0.1f;

            // ── Lap timing: iRacing raw → normalized fallback ────────────────
            s.LapCurrentTime    = Coalesce(GetRaw<float>(pm, "LapCurrentLapTime"),  GetNorm<float>(d, "CurrentLapTime"));
            s.LapLastTime       = Coalesce(GetRaw<float>(pm, "LapLastLapTime"),     GetNorm<float>(d, "LastLapTime"));
            s.LapBestTime       = Coalesce(GetRaw<float>(pm, "LapBestLapTime"),     GetNorm<float>(d, "BestLapTime"));
            s.LapDeltaToBest    = Coalesce(GetRaw<float>(pm, "LapDeltaToBestLap"),  GetNorm<float>(d, "DeltaToSessionBestLap"));
            s.SessionTimeRemain = Coalesce(GetRaw<double>(pm, "SessionTimeRemain"), GetNorm<double>(d, "SessionTimeLeft"));

            // ── iRacing-only ─────────────────────────────────────────────────
            s.SteeringWheelTorque = GetRaw<float>(pm, "SteeringWheelTorque");
            s.SessionFlags        = GetRaw<int>(pm, "SessionFlags");
            s.IncidentCount       = GetRaw<int>(pm, "PlayerCarMyIncidentCount");
            s.DrsStatus           = GetRaw<int>(pm, "DrsStatus");
            s.ErsBattery          = GetRaw<float>(pm, "EnergyERSBattery");
            s.MgukPower           = GetRaw<float>(pm, "PowerMGUK");
            s.PlayerCarIdx        = GetRaw<int>(pm, "PlayerCarIdx");
            s.CarIdxLapDistPct    = GetRawArray<float>(pm, "CarIdxLapDistPct");
            s.CarIdxOnPitRoad     = GetRawArray<bool>(pm, "CarIdxOnPitRoad");

            return s;
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        /// Returns primary if non-zero/non-default, otherwise fallback.
        private static T Coalesce<T>(T primary, T fallback) where T : IComparable<T>
        {
            return primary.CompareTo(default(T)) != 0 ? primary : fallback;
        }

        /// Read from iRacing's raw telemetry bus.
        private static T GetRaw<T>(PluginManager pm, string name)
        {
            try
            {
                var val = pm.GetPropertyValue("DataCorePlugin.GameRawData.Telemetry." + name);
                if (val is T typed) return typed;
                if (val != null) return (T)Convert.ChangeType(val, typeof(T));
            }
            catch { }
            return default(T);
        }

        private static T[] GetRawArray<T>(PluginManager pm, string name)
        {
            try
            {
                var val = pm.GetPropertyValue("DataCorePlugin.GameRawData.Telemetry." + name);
                if (val is T[] arr) return arr;
            }
            catch { }
            return new T[0];
        }

        /// Read from SimHub's normalized game data via reflection.
        /// Works for any game where SimHub populates the property on data.NewData.
        private static T GetNorm<T>(object d, string propName)
        {
            if (d == null) return default(T);
            try
            {
                var prop = d.GetType().GetProperty(propName,
                    BindingFlags.Public | BindingFlags.Instance | BindingFlags.FlattenHierarchy);
                if (prop == null) return default(T);
                var val = prop.GetValue(d);
                if (val is T typed) return typed;
                if (val != null) return (T)Convert.ChangeType(val, typeof(T));
            }
            catch { }
            return default(T);
        }
    }
}
