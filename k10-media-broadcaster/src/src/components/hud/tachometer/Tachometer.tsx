import { useMemo } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import styles from './Tachometer.module.css';

/**
 * Tachometer HUD Component
 * Displays gear, speed, RPM with visual bar indicator and redline state.
 * - 11 segments colored by RPM ratio: green (0-60%), yellow (60-80%), red (80-91%), redline (>91%)
 * - RPM text pulses with color based on engine load
 * - Whole component pulses when in redline state
 */
export function Tachometer() {
  const { telemetry } = useTelemetry();

  const rpmRatio = useMemo(() => {
    if (!telemetry.maxRpm || telemetry.maxRpm <= 0) return 0;
    return Math.min(telemetry.rpm / telemetry.maxRpm, 1.0);
  }, [telemetry.rpm, telemetry.maxRpm]);

  const isRedline = rpmRatio >= 0.91;

  // Determine RPM text pulse class
  const rpmPulseClass = useMemo(() => {
    if (rpmRatio < 0.6) return styles['rpm-pulse-green'];
    if (rpmRatio < 0.8) return styles['rpm-pulse-yellow'];
    return styles['rpm-pulse-red'];
  }, [rpmRatio]);

  // Generate 11 tachometer segments
  const segments = useMemo(() => {
    const numSegments = 11;
    const result = [];

    for (let i = 0; i < numSegments; i++) {
      const segmentRatio = (i + 1) / numSegments;
      let segmentClass = styles['tacho-seg'];

      if (rpmRatio >= segmentRatio) {
        // This segment should be lit
        if (segmentRatio <= 0.6) {
          segmentClass += ` ${styles['lit-green']}`;
        } else if (segmentRatio <= 0.8) {
          segmentClass += ` ${styles['lit-yellow']}`;
        } else if (segmentRatio <= 0.91) {
          segmentClass += ` ${styles['lit-red']}`;
        } else {
          segmentClass += ` ${styles['lit-redline']}`;
        }
      }

      result.push(
        <div key={i} className={segmentClass} />
      );
    }

    return result;
  }, [rpmRatio]);

  const blockClass = isRedline
    ? `${styles['tacho-block']} ${styles['tacho-redline']}`
    : styles['tacho-block'];

  return (
    <div className={blockClass}>
      <div className={styles['tacho-top-row']}>
        <div className={styles['tacho-gear']}>
          {telemetry.gear || 'N'}
        </div>
        <div className={styles['tacho-speed-cluster']}>
          <div className={styles['speed-value']}>
            {Math.round(telemetry.speedMph)}
          </div>
          <div className={styles['speed-unit']}>MPH</div>
        </div>
      </div>

      <span className={`${styles['tacho-rpm']} ${rpmPulseClass}`}>
        {Math.round(telemetry.rpm)}
      </span>

      <div className={styles['tacho-bar-track']}>
        {segments}
      </div>
    </div>
  );
}
