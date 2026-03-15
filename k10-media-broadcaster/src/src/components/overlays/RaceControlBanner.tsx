import { useMemo, useEffect, useState } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import styles from './RaceControlBanner.module.css';

interface FlagInfo {
  title: string;
  detail: string;
  flagClass: string;
}

export default function RaceControlBanner() {
  const { telemetry } = useTelemetry();
  const [isVisible, setIsVisible] = useState(false);
  const [hideTimer, setHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Map flag states to titles and details
  const flagInfo = useMemo((): FlagInfo | null => {
    const flag = telemetry.flagState;

    if (flag === 'Yellow') {
      return {
        title: 'CAUTION',
        detail: 'Full course yellow — hold position',
        flagClass: styles['rc-flag-yellow'] || '',
      };
    }

    if (flag === 'Red') {
      return {
        title: 'RED FLAG',
        detail: 'Session stopped — return to pits',
        flagClass: styles['rc-flag-red'] || '',
      };
    }

    if (flag === 'Checkered') {
      return {
        title: 'CHECKERED FLAG',
        detail: 'Race complete — cool down lap',
        flagClass: styles['rc-flag-checkered'] || '',
      };
    }

    if (flag === 'Black') {
      return {
        title: 'BLACK FLAG',
        detail: 'Penalty — report to pit lane immediately',
        flagClass: styles['rc-flag-black'] || '',
      };
    }

    return null;
  }, [telemetry.flagState]);

  // Show/hide banner based on flag state
  useEffect(() => {
    if (flagInfo) {
      setIsVisible(true);

      // Clear existing timer
      if (hideTimer) {
        clearTimeout(hideTimer);
      }

      // Set new hide timer (8 seconds)
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 8000);

      setHideTimer(timer);
    }
  }, [flagInfo, hideTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [hideTimer]);

  if (!flagInfo) {
    return null;
  }

  return (
    <div className={`${styles['rc-banner']} ${isVisible ? styles['rc-visible'] : ''} ${flagInfo.flagClass}`}>
      <div className={styles['rc-inner']}>
        <div className={styles['rc-title']}>{flagInfo.title}</div>
        <div className={styles['rc-detail']}>{flagInfo.detail}</div>
      </div>
    </div>
  );
}
