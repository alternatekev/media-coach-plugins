import { useMemo } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import styles from './PitLimiterBanner.module.css';

export default function PitLimiterBanner() {
  const { telemetry } = useTelemetry();

  // Convert speed from km/h to mph
  const speedMph = useMemo(() => {
    return telemetry.speedKmh * 0.621371;
  }, [telemetry.speedKmh]);

  const isVisible = useMemo(() => {
    return telemetry.isInPitLane;
  }, [telemetry.isInPitLane]);

  return (
    <div className={`${styles['pit-banner']} ${isVisible ? styles['pit-visible'] : ''}`}>
      <div className={styles['pit-inner']}>
        <span className={styles['pit-label']}>PIT LANE</span>
        <span className={styles['pit-speed']}>{speedMph.toFixed(1)} mph</span>
      </div>
    </div>
  );
}
