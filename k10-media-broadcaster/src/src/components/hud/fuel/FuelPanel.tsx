import { useMemo } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import styles from './FuelPanel.module.css';

/**
 * Fuel Panel HUD Component
 * Displays current fuel level, average consumption per lap, estimated remaining laps.
 * - Bar color: green (healthy > 25%), amber (low 10-25%), red (critical < 10%)
 * - Shows pit stop suggestion when estimated remaining laps < current fuel can support
 */
export function FuelPanel() {
  const { telemetry } = useTelemetry();

  // Calculate fuel percentage
  const fuelPercent = useMemo(() => {
    if (!telemetry.maxFuelLiters || telemetry.maxFuelLiters <= 0) return 0;
    return (telemetry.fuelLiters / telemetry.maxFuelLiters) * 100;
  }, [telemetry.fuelLiters, telemetry.maxFuelLiters]);

  // Determine fuel bar state
  const barState = useMemo(() => {
    if (fuelPercent > 25) return 'healthy';
    if (fuelPercent > 10) return 'low';
    return 'critical';
  }, [fuelPercent]);

  // Calculate estimated laps remaining (if fuelPerLap is available)
  const estimatedLaps = useMemo(() => {
    if (!telemetry.fuelPerLap || telemetry.fuelPerLap <= 0) return 0;
    return Math.floor(telemetry.fuelLiters / telemetry.fuelPerLap);
  }, [telemetry.fuelLiters, telemetry.fuelPerLap]);

  // Show pit suggestion if estimated laps < remaining laps
  const showPitSuggestion = useMemo(() => {
    return estimatedLaps < telemetry.fuelRemainingLaps;
  }, [estimatedLaps, telemetry.fuelRemainingLaps]);

  return (
    <div className={styles['fuel-block']}>
      <div className={styles['panel-label']}>Fuel</div>

      <div className={styles['fuel-remaining']}>
        {telemetry.fuelLiters > 0 ? telemetry.fuelLiters.toFixed(1) : '—'}
        <span className={styles['unit']}>L</span>
      </div>

      <div className={styles['fuel-bar-outer']}>
        <div
          className={`${styles['fuel-bar-inner']} ${styles[barState]}`}
          style={{ width: `${fuelPercent}%` }}
        />
      </div>

      <div className={styles['fuel-stats']}>
        <span>
          Avg <span className={styles['val']}>
            {telemetry.fuelPerLap > 0 ? telemetry.fuelPerLap.toFixed(2) : '—'}
          </span> L/lap
        </span>
        <span>
          Est <span className={styles['val']}>
            {estimatedLaps > 0 ? estimatedLaps : '—'}
          </span> laps
        </span>
      </div>

      {showPitSuggestion && (
        <div className={styles['fuel-pit-suggest']}>
          PIT FOR FUEL
        </div>
      )}
    </div>
  );
}
