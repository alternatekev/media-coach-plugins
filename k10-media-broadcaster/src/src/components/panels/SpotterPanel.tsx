import { useMemo, useEffect, useState } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import styles from './SpotterPanel.module.css';

type SpotterSeverity = 'danger' | 'warn' | 'clear' | null;

interface SpotterState {
  message: string;
  severity: SpotterSeverity;
}

export default function SpotterPanel() {
  const { telemetry } = useTelemetry();
  const [message, setMessage] = useState<SpotterState>({ message: '', severity: null });
  const [messageKey, setMessageKey] = useState<number>(0);
  const [hideTimer, setHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Generate spotter message based on gap data
  const spotterState = useMemo(() => {
    const gapAhead = telemetry.gapAhead;
    const gapBehind = telemetry.gapBehind;

    // Closing on car ahead (negative gap means closer)
    if (gapAhead < 0 && gapAhead > -10) {
      const timeGap = Math.abs(gapAhead);
      if (timeGap < 0.5) {
        return {
          message: `Closing — ${timeGap.toFixed(1)}s behind`,
          severity: 'danger' as SpotterSeverity,
        };
      } else if (timeGap < 1.5) {
        return {
          message: `Closing — ${timeGap.toFixed(1)}s behind`,
          severity: 'warn' as SpotterSeverity,
        };
      }
    }

    // Car right (car ahead and visible on right)
    if (gapAhead > 0 && gapAhead < 5) {
      if (gapAhead < 0.5) {
        return {
          message: `Car right — ${gapAhead.toFixed(1)}s`,
          severity: 'danger' as SpotterSeverity,
        };
      } else if (gapAhead < 1.5) {
        return {
          message: `Car right — ${gapAhead.toFixed(1)}s`,
          severity: 'warn' as SpotterSeverity,
        };
      }
    }

    // Pulling away (positive gap, increasing)
    if (gapBehind > 0 && gapBehind < 5) {
      return {
        message: `Pulling — ${gapBehind.toFixed(1)}s ahead`,
        severity: 'clear' as SpotterSeverity,
      };
    }

    // Car left (car behind)
    if (gapBehind < 0 && Math.abs(gapBehind) < 5) {
      const timeGap = Math.abs(gapBehind);
      if (timeGap < 0.5) {
        return {
          message: `Car left — ${timeGap.toFixed(1)}s`,
          severity: 'danger' as SpotterSeverity,
        };
      } else if (timeGap < 1.5) {
        return {
          message: `Car left — ${timeGap.toFixed(1)}s`,
          severity: 'warn' as SpotterSeverity,
        };
      }
    }

    // Clear state
    if (gapAhead > 5 && gapBehind > 5) {
      return {
        message: 'Clear — you passed',
        severity: 'clear' as SpotterSeverity,
      };
    }

    // Car passed you
    if (gapBehind < -5) {
      return {
        message: 'Car passed you',
        severity: 'warn' as SpotterSeverity,
      };
    }

    return { message: '', severity: null };
  }, [telemetry.gapAhead, telemetry.gapBehind]);

  // Update message when state changes
  useEffect(() => {
    if (spotterState.severity !== null) {
      // Only update if message actually changed
      if (spotterState.message !== message.message) {
        setMessage(spotterState);
        setMessageKey((prev) => prev + 1);

        // Clear any existing hide timer
        if (hideTimer) {
          clearTimeout(hideTimer);
        }

        // Set new hide timer (4 seconds)
        const timer = setTimeout(() => {
          setMessage({ message: '', severity: null });
        }, 4000);

        setHideTimer(timer);
      }
    }
  }, [spotterState, message.message, hideTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [hideTimer]);

  const severityClass = message.severity ? styles[`sp-${message.severity}`] : '';
  const isActive = message.severity !== null;

  return (
    <div className={styles['spotter-panel']} key={messageKey}>
      <div className={`${styles['sp-inner']} ${isActive ? styles['sp-active'] : ''} ${severityClass}`}>
        {message.message}
      </div>
    </div>
  );
}
