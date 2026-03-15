import { useState, useRef, useEffect } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import { fmtPercent } from '@lib/formatters';
import styles from './PedalsPanel.module.css';

const HISTORY_LENGTH = 20;

export default function PedalsPanel() {
  const { telemetry } = useTelemetry();

  // History arrays for pedals (0-1 range)
  const [throttleHist, setThrottleHist] = useState<number[]>(Array(HISTORY_LENGTH).fill(0));
  const [brakeHist, setBrakeHist] = useState<number[]>(Array(HISTORY_LENGTH).fill(0));
  const [clutchHist, setClutchHist] = useState<number[]>(Array(HISTORY_LENGTH).fill(0));

  const frameCountRef = useRef(0);

  // Update history every other frame
  useEffect(() => {
    frameCountRef.current++;

    if (frameCountRef.current % 2 === 0) {
      setThrottleHist((prev) => [...prev.slice(1), telemetry.throttleRaw]);
      setBrakeHist((prev) => [...prev.slice(1), telemetry.brakeRaw]);
      setClutchHist((prev) => [...prev.slice(1), telemetry.clutchRaw]);
    }
  }, [telemetry.throttleRaw, telemetry.brakeRaw, telemetry.clutchRaw]);

  return (
    <div
      className={styles.panel}
      style={{ '--thr-glow': telemetry.throttleRaw } as React.CSSProperties}
    >
      <div className={styles.pedalLabelsRow}>
        <div className={styles.pedalLabelGroup}>
          <div className={styles.pedalChannelLabelThrottle}>THR</div>
          <div className={styles.pedalPct} style={{ color: 'var(--green)' }}>
            {fmtPercent(telemetry.throttleRaw)}
          </div>
        </div>
        <div className={styles.pedalLabelGroup}>
          <div className={styles.pedalChannelLabelBrake}>BRK</div>
          <div className={styles.pedalPct} style={{ color: 'var(--red)' }}>
            {fmtPercent(telemetry.brakeRaw)}
          </div>
        </div>
        <div className={styles.pedalLabelGroup}>
          <div className={styles.pedalChannelLabelClutch}>CLT</div>
          <div className={styles.pedalPct} style={{ color: 'var(--blue)' }}>
            {fmtPercent(telemetry.clutchRaw)}
          </div>
        </div>
      </div>

      <div className={styles.pedalVizStack}>
        <div className={styles.pedalVizLayerThrottle}>
          {throttleHist.map((value, i) => (
            <div
              key={i}
              className={styles.pedalBar}
              style={{ height: `${value * 100}%` }}
            />
          ))}
        </div>
        <div className={styles.pedalVizLayerBrake}>
          {brakeHist.map((value, i) => (
            <div
              key={i}
              className={styles.pedalBar}
              style={{ height: `${value * 100}%` }}
            />
          ))}
        </div>
        <div className={styles.pedalVizLayerClutch}>
          {clutchHist.map((value, i) => (
            <div
              key={i}
              className={styles.pedalBar}
              style={{ height: `${value * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
