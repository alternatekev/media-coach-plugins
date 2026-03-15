import { useMemo } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import styles from './PitLimiterBanner.module.css';

const DEFAULT_PIT_SPEED_LIMIT_KMH = 72; // ~45 mph

export default function PitLimiterBanner() {
  const { telemetry } = useTelemetry();

  const pitSpeedLimitKmh = useMemo(() => {
    return telemetry.pitSpeedLimitKmh || DEFAULT_PIT_SPEED_LIMIT_KMH;
  }, [telemetry.pitSpeedLimitKmh]);

  const pitSpeedLimitMph = useMemo(() => {
    return pitSpeedLimitKmh * 0.621371;
  }, [pitSpeedLimitKmh]);

  const speedMph = useMemo(() => {
    return telemetry.speedKmh * 0.621371;
  }, [telemetry.speedKmh]);

  const isVisible = useMemo(() => {
    return telemetry.isInPitLane;
  }, [telemetry.isInPitLane]);

  const isOverLimit = useMemo(() => {
    return isVisible && telemetry.isInPitLane && !telemetry.pitLimiterOn;
  }, [isVisible, telemetry.pitLimiterOn]);

  return (
    <div className={`${styles['pit-banner']} ${isVisible ? styles['pit-visible'] : ''} ${isOverLimit ? styles['pit-flash'] : ''}`}>
      <div className={styles['pit-inner']}>
        <div className={styles['pit-icon']}>P</div>
        <span className={styles['pit-label']}>Pit Limiter</span>
        <span className={`${styles['pit-speed']} ${isOverLimit ? styles['pit-speed-over'] : ''}`}>
          {speedMph.toFixed(0)} mph / {pitSpeedLimitMph.toFixed(0)} mph limit
        </span>
      </div>
    </div>
  );
}
