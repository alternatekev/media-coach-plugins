import { useState, useEffect } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';

import styles from './ControlsPanel.module.css';

export default function ControlsPanel() {
  const { telemetry } = useTelemetry();

  // BB: brake bias, normalize from 0-100 range to percentage, center at ~50
  // Map 30-70 range to 0-100%
  const brakeBiasPercent = Math.max(0, Math.min(100, ((telemetry.brakeBias - 30) / 40) * 100));

  // TC and ABS: 0-12 range
  const tcLevel = telemetry.tc;
  const absLevel = telemetry.abs;

  // Flash animation state when values change
  const [prevBB, setPrevBB] = useState(brakeBiasPercent);
  const [prevTC, setPrevTC] = useState(tcLevel);
  const [prevABS, setPrevABS] = useState(absLevel);

  const [flashBB, setFlashBB] = useState(false);
  const [flashTC, setFlashTC] = useState(false);
  const [flashABS, setFlashABS] = useState(false);

  useEffect(() => {
    if (brakeBiasPercent !== prevBB) {
      setPrevBB(brakeBiasPercent);
      setFlashBB(true);
      const timer = setTimeout(() => setFlashBB(false), 150);
      return () => clearTimeout(timer);
    }
  }, [brakeBiasPercent, prevBB]);

  useEffect(() => {
    if (tcLevel !== prevTC) {
      setPrevTC(tcLevel);
      setFlashTC(true);
      const timer = setTimeout(() => setFlashTC(false), 150);
      return () => clearTimeout(timer);
    }
  }, [tcLevel, prevTC]);

  useEffect(() => {
    if (absLevel !== prevABS) {
      setPrevABS(absLevel);
      setFlashABS(true);
      const timer = setTimeout(() => setFlashABS(false), 150);
      return () => clearTimeout(timer);
    }
  }, [absLevel, prevABS]);

  const hasControls = brakeBiasPercent > 0 || tcLevel > 0 || absLevel > 0;

  return (
    <div className={styles.panel}>
      {hasControls ? (
        <>
          <div
            className={`${styles.ctrlItem} ${flashBB ? styles.flash : ''}`}
            style={{ '--ctrl-pct': `${brakeBiasPercent}%` } as React.CSSProperties}
          >
            <div className={styles.ctrlLabel}>BB</div>
            <div className={styles.ctrlValue}>{brakeBiasPercent.toFixed(1)}%</div>
          </div>
          <div className={`${styles.ctrlItem} ${flashTC ? styles.flash : ''}`}>
            <div className={styles.ctrlLabel}>TC</div>
            <div className={styles.ctrlValue}>{tcLevel > 0 ? tcLevel : '—'}</div>
          </div>
          <div className={`${styles.ctrlItem} ${flashABS ? styles.flash : ''}`}>
            <div className={styles.ctrlLabel}>ABS</div>
            <div className={styles.ctrlValue}>{absLevel > 0 ? absLevel : '—'}</div>
          </div>
        </>
      ) : (
        <div className={styles.ctrlNoAdj}>NO ADJUSTMENTS</div>
      )}
    </div>
  );
}
