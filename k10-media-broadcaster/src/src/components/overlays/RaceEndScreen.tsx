import { useState, useEffect, useMemo } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import { fmtLap, fmtIRating } from '@lib/formatters';
import styles from './RaceEndScreen.module.css';

export default function RaceEndScreen() {
  const { telemetry } = useTelemetry();
  const [isVisible, setIsVisible] = useState(false);
  const [hideTimer, setHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [prevFlagState, setPrevFlagState] = useState<string>(telemetry.flagState);

  // Detect DNF: position is 0 OR checkered but completed far fewer laps than total
  const isDNF = useMemo(() => {
    if (telemetry.position === 0) return true;
    if (telemetry.flagState === 'Checkered') {
      const lapThreshold = Math.max(1, Math.floor(telemetry.totalLaps * 0.5));
      if (telemetry.completedLaps < lapThreshold) {
        return true;
      }
    }
    return false;
  }, [telemetry.position, telemetry.flagState, telemetry.totalLaps, telemetry.completedLaps]);

  // Determine finish type
  const finishType = useMemo(() => {
    if (isDNF) return 'dnf';
    if (telemetry.position >= 1 && telemetry.position <= 3) return 'podium';
    if (telemetry.position >= 4 && telemetry.position <= 10) return 'strong';
    return 'midpack';
  }, [isDNF, telemetry.position]);

  // Determine main title and tint
  const titleInfo = useMemo(() => {
    if (isDNF) {
      return {
        title: 'TOUGH BREAK',
        subtitle: 'Every lap is a lesson. Regroup and go again.',
        tintClass: styles['tint-purple'],
      };
    }

    if (finishType === 'podium') {
      if (telemetry.position === 1) {
        return {
          title: 'VICTORY!',
          subtitle: null,
          tintClass: styles['tint-gold'],
        };
      } else {
        return {
          title: 'PODIUM FINISH!',
          subtitle: null,
          tintClass:
            telemetry.position === 2
              ? styles['tint-silver']
              : styles['tint-bronze'],
        };
      }
    }

    if (finishType === 'strong') {
      return {
        title: 'STRONG FINISH',
        subtitle: null,
        tintClass: styles['tint-green'],
      };
    }

    return {
      title: 'RACE COMPLETE',
      subtitle: null,
      tintClass: styles['tint-neutral'],
    };
  }, [isDNF, finishType, telemetry.position]);

  // Check for clean race badge
  const isCleanRace = useMemo(() => {
    return telemetry.incidentCount <= 4;
  }, [telemetry.incidentCount]);

  // Trigger visibility on checkered flag
  useEffect(() => {
    if (
      telemetry.flagState === 'Checkered' &&
      prevFlagState !== 'Checkered'
    ) {
      setIsVisible(true);

      if (hideTimer) {
        clearTimeout(hideTimer);
      }

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 30000);

      setHideTimer(timer);
    }

    setPrevFlagState(telemetry.flagState);
  }, [telemetry.flagState, prevFlagState, hideTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [hideTimer]);

  // Click to dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
  };

  if (!isVisible || telemetry.flagState !== 'Checkered') {
    return null;
  }

  return (
    <div
      className={`${styles['race-end-screen']} ${isVisible ? styles.visible : ''} ${titleInfo.tintClass}`}
      onClick={handleDismiss}
    >
      {/* Backdrop blur overlay */}
      <div className={styles.backdrop} />

      {/* Confetti particles (podium only) */}
      {finishType === 'podium' && (
        <div className={styles['confetti-container']}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={styles['confetti-particle']}
              style={{
                left: `${Math.random() * 100}%`,
                delay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {/* Main position number */}
        <div className={styles['position-number']}>
          {!isDNF && telemetry.position > 0 ? `P${telemetry.position}` : '—'}
        </div>

        {/* Title and subtitle */}
        <div className={styles['title-block']}>
          <h1 className={styles.title}>{titleInfo.title}</h1>
          {titleInfo.subtitle && (
            <p className={styles.subtitle}>{titleInfo.subtitle}</p>
          )}
        </div>

        {/* Clean race badge */}
        {isCleanRace && (
          <div className={styles['clean-badge']}>
            <span>✓</span> CLEAN RACE
          </div>
        )}

        {/* Stats grid */}
        <div className={styles['stats-grid']}>
          <div className={styles['stat-item']}>
            <div className={styles['stat-label']}>POSITION</div>
            <div className={styles['stat-value']}>
              {!isDNF && telemetry.position > 0
                ? `P${telemetry.position}`
                : 'DNF'}
            </div>
          </div>

          <div className={styles['stat-item']}>
            <div className={styles['stat-label']}>INCIDENTS</div>
            <div className={styles['stat-value']}>{telemetry.incidentCount}</div>
          </div>

          <div className={styles['stat-item']}>
            <div className={styles['stat-label']}>BEST LAP</div>
            <div className={styles['stat-value']}>
              {fmtLap(telemetry.bestLapTime)}
            </div>
          </div>

          <div className={styles['stat-item']}>
            <div className={styles['stat-label']}>iRATING</div>
            <div className={styles['stat-value']}>
              {fmtIRating(telemetry.iRating)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
