import { useMemo, useEffect, useState } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import { useSettings } from '@hooks/useSettings';
import styles from './IncidentsPanel.module.css';

export default function IncidentsPanel() {
  const { telemetry } = useTelemetry();
  const { settings } = useSettings();

  const [flashKey, setFlashKey] = useState<number>(0);
  const [prevIncidents, setPrevIncidents] = useState<number>(0);

  // Trigger flash animation when incident count increments
  useEffect(() => {
    if (telemetry.incidentCount > prevIncidents) {
      setFlashKey((prev) => prev + 1);
    }
    setPrevIncidents(telemetry.incidentCount);
  }, [telemetry.incidentCount, prevIncidents]);

  // Determine incident level (0-5)
  const incidentLevel = useMemo(() => {
    const count = telemetry.incidentCount;
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    if (count <= 9) return 4;
    return 5;
  }, [telemetry.incidentCount]);

  // Calculate thresholds
  const remainingPenalty = useMemo(() => {
    return Math.max(0, settings.incPenalty - telemetry.incidentCount);
  }, [telemetry.incidentCount, settings.incPenalty]);

  const remainingDQ = useMemo(() => {
    return Math.max(0, settings.incDQ - telemetry.incidentCount);
  }, [telemetry.incidentCount, settings.incDQ]);

  // Determine threshold severity
  const getPenaltyThreshClass = (remaining: number): string => {
    if (remaining === 0) return styles['thresh-hit'] || '';
    if (remaining <= 2) return styles['thresh-crit'] || '';
    if (remaining <= 4) return styles['thresh-near'] || '';
    return '';
  };

  const getDQThreshClass = (remaining: number): string => {
    if (remaining === 0) return styles['thresh-hit'] || '';
    if (remaining <= 2) return styles['thresh-crit'] || '';
    if (remaining <= 4) return styles['thresh-near'] || '';
    return '';
  };

  return (
    <div className={`${styles['incidents-panel']} ${styles[`inc-level-${incidentLevel}`]}`}>
      <div className={`${styles['inc-count']} ${flashKey > 0 ? styles['inc-flash'] : ''}`} key={flashKey}>
        {telemetry.incidentCount}
      </div>

      {remainingPenalty === 0 && (
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--red)', marginTop: '4px' }}>
          PENALTY
        </div>
      )}

      {remainingDQ === 0 && (
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--red)', marginTop: '4px' }}>
          DQ
        </div>
      )}

      <div className={styles['inc-thresh']}>
        <span className={styles['inc-thresh-label']}>Penalty</span>
        <span className={`${styles['inc-thresh-val']} ${getPenaltyThreshClass(remainingPenalty)}`}>
          {remainingPenalty}
        </span>
      </div>

      <div className={styles['inc-thresh']}>
        <span className={styles['inc-thresh-label']}>DQ</span>
        <span className={`${styles['inc-thresh-val']} ${getDQThreshClass(remainingDQ)}`}>
          {remainingDQ}
        </span>
      </div>
    </div>
  );
}
