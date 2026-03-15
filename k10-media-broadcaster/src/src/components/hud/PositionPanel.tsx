import { useState, useEffect } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import { fmtLap } from '@lib/formatters';
import styles from './PositionPanel.module.css';

export default function PositionPanel() {
  const { telemetry } = useTelemetry();

  const [activePage, setActivePage] = useState<'rating' | 'position'>('rating');

  // Auto-cycle between pages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePage((prev) => (prev === 'rating' ? 'position' : 'rating'));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // iRating bar: 0-5000 range mapped to 0-100%
  const iRatingPercent = Math.max(0, Math.min(100, (telemetry.iRating / 5000) * 100));

  // SR pie: 0-4.0 range, circumference = 2πr = 2π(15) ≈ 94.25
  // Stroke dasharray = perimeter, dashoffset = perimeter - (sr/4)*perimeter
  const srPerimeter = 2 * Math.PI * 15;
  const srOffset = srPerimeter - (telemetry.safetyRating / 4.0) * srPerimeter;

  // Position delta: compare current position to a starting position
  // For now, assume starting position = 1, so delta = position - 1
  const posDelta = telemetry.position - 1;
  const posIndicator = posDelta > 0 ? '▼' : posDelta < 0 ? '▲' : '—';
  const posIndicatorColor = posDelta > 0 ? 'var(--red)' : posDelta < 0 ? 'var(--green)' : 'var(--text-dim)';

  return (
    <div className={styles.panel}>
      <div className={styles.cycleSizer}>
        <div className={styles.posLayout}>
          <div className={styles.posNumber}>
            <span className={styles.skewAccent}>P{telemetry.position}</span>
            <div className={styles.posDelta} style={{ color: posIndicatorColor }}>
              {posIndicator}
            </div>
          </div>
          <div className={styles.posMeta}>
            <div className={styles.posMetaRow}>
              Lap <span className={styles.val}>{telemetry.currentLap}</span>
            </div>
            <div className={`${styles.posMetaRow} ${styles.bestRow}`}>
              <span className={`${styles.val} ${styles.purple}`}>
                {fmtLap(telemetry.bestLapTime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Page A: Rating */}
      <div className={`${styles.cyclePage} ${activePage === 'rating' ? styles.active : styles.inactive}`}>
        <div className={styles.ratingRow}>
          <div className={styles.ratingItem}>
            <div className={styles.panelLabel}>iRating</div>
            <div className={styles.ratingValue}>{telemetry.iRating}</div>
            <div className={styles.ratingDelta}>—</div>
            <div className={styles.irBarContainer}>
              <div className={styles.irBarTrack}>
                <div
                  className={styles.irBarFill}
                  style={{ width: `${iRatingPercent}%` }}
                />
                <div className={styles.irBarTicks}>
                  <div className={styles.irBarTick} style={{ left: '20%' }} />
                  <div className={styles.irBarTickLabel} style={{ left: '20%' }}>
                    1k
                  </div>
                  <div className={styles.irBarTick} style={{ left: '40%' }} />
                  <div className={styles.irBarTickLabel} style={{ left: '40%' }}>
                    2k
                  </div>
                  <div className={styles.irBarTick} style={{ left: '60%' }} />
                  <div className={styles.irBarTickLabel} style={{ left: '60%' }}>
                    3k
                  </div>
                  <div className={styles.irBarTick} style={{ left: '80%' }} />
                  <div className={styles.irBarTickLabel} style={{ left: '80%' }}>
                    4k
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.ratingItem}>
            <div className={styles.panelLabel}>Safety</div>
            <div className={styles.ratingValue} style={{ fontSize: '14px' }}>
              {telemetry.safetyRating.toFixed(2)}
            </div>
            <div className={styles.ratingDelta}>—</div>
            <div className={styles.srPieContainer}>
              <svg className={styles.srPieSvg} viewBox="0 0 40 40">
                <circle className={styles.srPieBg} cx="20" cy="20" r="15" />
                <circle
                  className={styles.srPieFill}
                  cx="20"
                  cy="20"
                  r="15"
                  stroke="var(--green)"
                  strokeDasharray={srPerimeter}
                  strokeDashoffset={srOffset}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Page B: Position */}
      <div className={`${styles.cyclePage} ${activePage === 'position' ? styles.active : styles.inactive}`}>
        <div className={styles.posLayout}>
          <div className={styles.posNumber}>
            <span className={styles.skewAccent}>P{telemetry.position}</span>
            <div className={styles.posDelta} style={{ color: posIndicatorColor }}>
              {posIndicator}
            </div>
          </div>
          <div className={styles.posMeta}>
            <div className={styles.posMetaRow}>
              Lap <span className={styles.val}>{telemetry.currentLap}</span>
            </div>
            <div className={`${styles.posMetaRow} ${styles.bestRow}`}>
              <span className={`${styles.val} ${styles.purple}`}>
                {fmtLap(telemetry.bestLapTime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cycle dots */}
      <div className={styles.cycleDots}>
        <div
          className={`${styles.cycleDot} ${activePage === 'rating' ? styles.active : ''}`}
          onClick={() => setActivePage('rating')}
        />
        <div
          className={`${styles.cycleDot} ${activePage === 'position' ? styles.active : ''}`}
          onClick={() => setActivePage('position')}
        />
      </div>
    </div>
  );
}
