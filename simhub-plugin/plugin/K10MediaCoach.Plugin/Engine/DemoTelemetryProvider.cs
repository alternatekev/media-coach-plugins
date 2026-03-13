using System;

namespace K10MediaCoach.Plugin.Engine
{
    /// <summary>
    /// Simulates realistic race telemetry for demo mode so the full HUD is populated.
    /// Generates smoothly-animated speed, RPM, gear, pedals, fuel, tyres, and positions
    /// by simulating a car driving a track with corners and straights.
    /// The DemoSequence overlays event-specific state (position changes, flags, incidents).
    /// </summary>
    public class DemoTelemetryProvider
    {
        private readonly Random _rng = new Random();

        // ── Track profile: position → target speed (mph) keyframes ──────────
        // Simulates a ~2km road course with tight corners and fast straights.
        private static readonly double[] TrackPos   = { 0.00, 0.08, 0.14, 0.22, 0.34, 0.42, 0.50, 0.58, 0.65, 0.74, 0.84, 0.92, 1.00 };
        private static readonly double[] TrackSpeed = { 148,  56,   95,   168,  72,   105,  178,  52,   88,   162,  68,   132,  148  };

        // ── Gear thresholds (mph) ───────────────────────────────────────────
        private static readonly double[] GearMinSpeeds = { 0, 0, 35, 62, 95, 128, 155 };

        // ── Simulation time ─────────────────────────────────────────────────
        private double _elapsed  = 0;
        private double _lapTime  = 88.0;  // seconds per lap
        private double _trackPos = 0;
        private double _prevSpeed = 120;

        /// <summary>Current track position (0–1 fraction) for map animation.</summary>
        public double TrackPosition => _trackPos;

        /// <summary>Total elapsed demo time in seconds.</summary>
        public double Elapsed => _elapsed;

        // ── Exposed state (read by Plugin.cs via properties) ────────────────
        public string Gear     { get; private set; } = "3";
        public double Rpm      { get; private set; } = 4200;
        public double MaxRpm   { get; private set; } = 8500;
        public double SpeedMph { get; private set; } = 120;

        public double Throttle { get; private set; } = 0.5;
        public double Brake    { get; private set; } = 0;
        public double Clutch   { get; private set; } = 0;

        public double Fuel         { get; private set; } = 38.0;
        public double MaxFuel      { get; private set; } = 45.0;
        public double FuelPerLap   { get; private set; } = 2.85;
        public int    RemainingLaps { get; private set; } = 12;

        public double TyreTempFL { get; private set; } = 196;
        public double TyreTempFR { get; private set; } = 199;
        public double TyreTempRL { get; private set; } = 190;
        public double TyreTempRR { get; private set; } = 192;

        public double TyreWearFL { get; private set; } = 0.82;
        public double TyreWearFR { get; private set; } = 0.79;
        public double TyreWearRL { get; private set; } = 0.86;
        public double TyreWearRR { get; private set; } = 0.85;

        public double BrakeBias { get; private set; } = 56.2;
        public double TC        { get; private set; } = 4;
        public double ABS       { get; private set; } = 3;

        public int    Position       { get; private set; } = 6;
        public int    CurrentLap     { get; private set; } = 1;
        public double BestLapTime    { get; private set; } = 92.410;
        public string CarModel       { get; private set; } = "BMW M4 GT3";

        // Cycle through different car models in demo to exercise the logo system
        private static readonly string[] _demoCarModels = new[]
        {
            "BMW M4 GT3", "Porsche 911 GT3 R", "Ferrari 296 GT3",
            "Mercedes-AMG GT3", "McLaren 720S GT3", "Audi R8 LMS GT3",
            "Lamborghini Huracan GT3", "Chevrolet Corvette Z06 GT3.R",
            "Ford Mustang GT3", "Aston Martin Vantage GT3"
        };
        private int _demoCarIdx = 0;

        public int    IRating        { get; private set; } = 2673;
        public double SafetyRating   { get; private set; } = 3.24;

        public double GapAhead       { get; private set; } = 1.8;
        public double GapBehind      { get; private set; } = 2.1;
        public string DriverAhead    { get; private set; } = "A. Martinez";
        public string DriverBehind   { get; private set; } = "J. Williams";
        public int    IRAhead        { get; private set; } = 2847;
        public int    IRBehind       { get; private set; } = 3214;

        /// <summary>
        /// Advance simulation by dt seconds (~0.1s at 6-frame eval cadence at 60fps).
        /// </summary>
        public void Tick(double dt)
        {
            _elapsed += dt;

            // Advance track position (wraps at 1.0 = one lap)
            _trackPos += dt / _lapTime;
            if (_trackPos >= 1.0)
            {
                _trackPos -= 1.0;
                CurrentLap++;
                Fuel = Math.Max(0.5, Fuel - FuelPerLap);

                // Cycle car model every 2 laps
                if (CurrentLap % 2 == 0)
                {
                    _demoCarIdx = (_demoCarIdx + 1) % _demoCarModels.Length;
                    CarModel = _demoCarModels[_demoCarIdx];
                }
                RemainingLaps = Math.Max(0, RemainingLaps - 1);

                // Wear degrades slightly each lap
                TyreWearFL = Math.Max(0.10, TyreWearFL - 0.018 - _rng.NextDouble() * 0.006);
                TyreWearFR = Math.Max(0.10, TyreWearFR - 0.020 - _rng.NextDouble() * 0.006);
                TyreWearRL = Math.Max(0.10, TyreWearRL - 0.014 - _rng.NextDouble() * 0.004);
                TyreWearRR = Math.Max(0.10, TyreWearRR - 0.015 - _rng.NextDouble() * 0.004);
            }

            // Interpolate target speed from track profile
            double targetSpeed = InterpolateSpeed(_trackPos);

            // Smooth toward target (low-pass filter)
            double lerpRate = 3.5 * dt;
            SpeedMph = SpeedMph + (targetSpeed - SpeedMph) * Math.Min(1.0, lerpRate);

            // Speed delta for pedal derivation
            double speedDelta = SpeedMph - _prevSpeed;
            _prevSpeed = SpeedMph;

            // Pedals from speed change
            if (speedDelta > 0.5)
            {
                Throttle = Math.Min(1.0, 0.3 + speedDelta * 0.08);
                Brake = 0;
            }
            else if (speedDelta < -1.5)
            {
                Throttle = 0;
                Brake = Math.Min(1.0, Math.Abs(speedDelta) * 0.06);
            }
            else
            {
                // Coast / maintenance throttle
                Throttle = 0.15 + _rng.NextDouble() * 0.10;
                Brake = 0;
            }
            Clutch = 0; // rarely used in race

            // Gear from speed
            int g = 1;
            for (int i = 6; i >= 1; i--)
            {
                if (SpeedMph >= GearMinSpeeds[i]) { g = i; break; }
            }
            Gear = g.ToString();

            // RPM: sawtooth within gear range
            double gMin = GearMinSpeeds[g];
            double gMax = g < 6 ? GearMinSpeeds[g + 1] : 200;
            double gFrac = (gMax > gMin) ? (SpeedMph - gMin) / (gMax - gMin) : 0.5;
            gFrac = Math.Max(0, Math.Min(1, gFrac));
            Rpm = 3200 + gFrac * (MaxRpm - 3500) + (_rng.NextDouble() - 0.5) * 80;

            // Tyre temps: base + cornering heat (higher in corners where speed is lower)
            double cornerFactor = Math.Max(0, 1.0 - SpeedMph / 180.0);
            double heatNoise = (_rng.NextDouble() - 0.5) * 3.0;
            TyreTempFL = 175 + cornerFactor * 55 + heatNoise + (1 - TyreWearFL) * 15;
            TyreTempFR = 178 + cornerFactor * 58 + heatNoise + (1 - TyreWearFR) * 15;
            TyreTempRL = 170 + cornerFactor * 40 + heatNoise + (1 - TyreWearRL) * 10;
            TyreTempRR = 172 + cornerFactor * 42 + heatNoise + (1 - TyreWearRR) * 10;

            // Gaps drift slightly
            if (_rng.NextDouble() < 0.05)
            {
                GapAhead  = Math.Max(0.2, GapAhead  + (_rng.NextDouble() - 0.48) * 0.3);
                GapBehind = Math.Max(0.2, GapBehind + (_rng.NextDouble() - 0.48) * 0.3);
            }
        }

        /// <summary>
        /// Called when a DemoSequence step fires, to sync event-driven state
        /// (position, driver names, flags, etc.) with the telemetry animation.
        /// </summary>
        public void ApplyDemoStep(TelemetrySnapshot snap)
        {
            if (snap == null) return;

            Position     = snap.Position;
            CurrentLap   = snap.CurrentLap > 0 ? snap.CurrentLap : CurrentLap;

            if (!string.IsNullOrEmpty(snap.NearestAheadName))
            {
                DriverAhead = snap.NearestAheadName;
                IRAhead     = snap.NearestAheadRating;
            }
            if (!string.IsNullOrEmpty(snap.NearestBehindName))
            {
                DriverBehind = snap.NearestBehindName;
                IRBehind     = snap.NearestBehindRating;
            }
            if (snap.FuelPercent > 0 && snap.FuelPercent < 1)
            {
                Fuel = snap.FuelPercent * MaxFuel;
            }
            if (snap.IsInPitLane)
            {
                SpeedMph = 45;
                Throttle = 0.2;
                Brake = 0;
                Gear = "2";
                Rpm = 3800;
            }
        }

        /// <summary>
        /// Reset to initial state (called when demo mode is toggled on).
        /// </summary>
        public void Reset()
        {
            _elapsed   = 0;
            _trackPos  = 0;
            _prevSpeed = 120;
            CurrentLap = 1;
            Position   = 6;
            Fuel       = 38.0;
            TyreWearFL = 0.82;
            TyreWearFR = 0.79;
            TyreWearRL = 0.86;
            TyreWearRR = 0.85;
            GapAhead   = 1.8;
            GapBehind  = 2.1;
            DriverAhead  = "A. Martinez";
            DriverBehind = "J. Williams";
            IRAhead  = 2847;
            IRBehind = 3214;
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private static double InterpolateSpeed(double pos)
        {
            pos = pos % 1.0;
            for (int i = 0; i < TrackPos.Length - 1; i++)
            {
                if (pos >= TrackPos[i] && pos <= TrackPos[i + 1])
                {
                    double frac = (pos - TrackPos[i]) / (TrackPos[i + 1] - TrackPos[i]);
                    // Smooth step for more natural acceleration/braking curves
                    frac = frac * frac * (3 - 2 * frac);
                    return TrackSpeed[i] + (TrackSpeed[i + 1] - TrackSpeed[i]) * frac;
                }
            }
            return TrackSpeed[0];
        }
    }
}
