import { useState, useEffect } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import { fmtGap } from '@lib/formatters';
import styles from './GapsPanel.module.css';

export default function GapsPanel() {
  const { telemetry } = useTelemetry();

  // Flash animation state when driver changes
  const [prevDriverAhead, setPrevDriverAhead] = useState(telemetry.driverAhead);
  const [prevDriverBehind, setPrevDriverBehind] = useState(telemetry.driverBehind);

  const [flashAhead, setFlashAhead] = useState(false);
  const [flashBehind, setFlashBehind] = useState(false);

  useEffect(() => {
    if (telemetry.driverAhead !== prevDriverAhead) {
      setPrevDriverAhead(telemetry.driverAhead);
      setFlashAhead(true);
      const timer = setTimeout(() => setFlashAhead(false), 150);
      return () => clearTimeout(timer);
    }
  }, [telemetry.driverAhead, prevDriverAhead]);

  useEffect(() => {
    if (telemetry.driverBehind !== prevDriverBehind) {
      setPrevDriverBehind(telemetry.driverBehind);
      setFlashBehind(true);
      const timer = setTimeout(() => setFlashBehind(false), 150);
      return () => clearTimeout(timer);
    }
  }, [telemetry.driverBehind, prevDriverBehind]);

  // Determine flag state and styling
  const flagState = telemetry.flagState.toLowerCase();
  const isFlagActive = flagState && flagState !== 'green' && flagState !== 'none';

  // Flag label and context based on flag type
  const getFlagDisplay = () => {
    switch (flagState) {
      case 'yellow':
        return { label: 'YELLOW FLAG', context: 'Caution' };
      case 'red':
        return { label: 'RED FLAG', context: 'Session stopped' };
      case 'blue':
        return { label: 'BLUE FLAG', context: 'Faster car approaching' };
      case 'white':
        return { label: 'WHITE FLAG', context: 'Last lap' };
      case 'green':
        return { label: 'GREEN FLAG', context: 'Track clear' };
      case 'debris':
        return { label: 'DEBRIS', context: 'Debris on track' };
      case 'checkered':
        return { label: 'CHECKERED', context: 'Session finished' };
      case 'black':
        return { label: 'BLACK FLAG', context: 'Disqualified' };
      default:
        return { label: '', context: '' };
    }
  };

  const flagDisplay = getFlagDisplay();

  return (
    <div className={`${styles.panel} ${isFlagActive ? `${styles.flagActive} ${styles[`flag${flagState.charAt(0).toUpperCase() + flagState.slice(1)}`]}` : ''}`}>
      <div className={`${styles.gapItem} ${flashAhead ? styles.flash : ''}`}>
        <div className={styles.gapNormal}>
          <div className={styles.panelLabel}>Ahead</div>
          <div className={`${styles.gapTime} ${styles.ahead}`}>
            {fmtGap(telemetry.gapAhead) || '—'}
          </div>
          <div className={styles.gapDriver}>{telemetry.driverAhead || '—'}</div>
          <div className={styles.gapIr}>
            {telemetry.irAhead > 0 ? `iR: ${telemetry.irAhead}` : ''}
          </div>
        </div>
      </div>

      <div className={`${styles.gapItem} ${flashBehind ? styles.flash : ''}`}>
        <div className={styles.gapNormal}>
          <div className={styles.panelLabel}>Behind</div>
          <div className={`${styles.gapTime} ${styles.behind}`}>
            {fmtGap(telemetry.gapBehind) || '—'}
          </div>
          <div className={styles.gapDriver}>{telemetry.driverBehind || '—'}</div>
          <div className={styles.gapIr}>
            {telemetry.irBehind > 0 ? `iR: ${telemetry.irBehind}` : ''}
          </div>
        </div>
      </div>

      {/* Flag overlay */}
      <div className={styles.flagOverlay}>
        <div className={styles.flagLabel}>{flagDisplay.label}</div>
        <div className={styles.flagContext}>{flagDisplay.context}</div>
      </div>
    </div>
  );
}
