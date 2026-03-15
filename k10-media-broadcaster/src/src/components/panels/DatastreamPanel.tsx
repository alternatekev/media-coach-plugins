import { useState, useEffect, useRef } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import styles from './DatastreamPanel.module.css';

/**
 * Track the last 40 G-force samples for drawing trails
 */
interface GForceSample {
  latG: number;
  longG: number;
  timestamp: number;
}

/**
 * Draw G-force diamond with trail and current position
 */
function GForceDiamond({
  latG,
  longG,
  samples,
  peakG,
}: {
  latG: number;
  longG: number;
  samples: GForceSample[];
  peakG: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;

    // Clear canvas
    ctx.fillStyle = 'rgba(10, 10, 10, 1)';
    ctx.fillRect(0, 0, w, h);

    // Diamond size (scale factor)
    const scale = 18;

    // Draw diamond outline (rotated square)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX + scale, centerY); // Right
    ctx.lineTo(centerX, centerY + scale); // Bottom
    ctx.lineTo(centerX - scale, centerY); // Left
    ctx.lineTo(centerX, centerY - scale); // Top
    ctx.closePath();
    ctx.stroke();

    // Draw crosshair grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX - scale * 1.2, centerY);
    ctx.lineTo(centerX + scale * 1.2, centerY);
    ctx.moveTo(centerX, centerY - scale * 1.2);
    ctx.lineTo(centerX, centerY + scale * 1.2);
    ctx.stroke();

    // Draw trail (last 40 samples, faded)
    if (samples.length > 1) {
      ctx.strokeStyle = 'rgba(100, 100, 255, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();

      samples.forEach((sample, i) => {
        const x = centerX + sample.latG * scale;
        const y = centerY + sample.longG * scale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw current position dot
    const currentX = centerX + latG * scale;
    const currentY = centerY + longG * scale;
    const totalG = Math.sqrt(latG * latG + longG * longG);
    const maxG = Math.max(peakG, 2);
    const ratio = Math.min(totalG / maxG, 1);

    // Gradient from blue (low) to red (high)
    const hue = 240 - ratio * 60; // 240 (blue) to 0 (red)
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Peak G text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${totalG.toFixed(1)}G`, centerX, 2);
  }, [latG, longG, samples, peakG]);

  return <canvas ref={canvasRef} width={64} height={64} className={styles.dsGforceCanvas} />;
}

/**
 * Yaw rate bar: centered bar that extends left or right
 */
function YawRateBar({ yawRate }: { yawRate: number }) {
  const percent = Math.max(-100, Math.min(100, yawRate * 10)); // Scale and clamp

  return (
    <div className={styles.dsBar}>
      <div className={styles.dsBarCenter} />
      {percent < 0 ? (
        <div
          className={styles.dsBarFill}
          style={{
            left: '50%',
            width: `${Math.abs(percent)}%`,
            background: 'linear-gradient(to left, rgba(0, 255, 0, 0.4), rgba(0, 255, 0, 0))',
          }}
        />
      ) : (
        <div
          className={styles.dsBarFill}
          style={{
            left: '50%',
            width: `${percent}%`,
            background: 'linear-gradient(to right, rgba(0, 255, 0, 0.4), rgba(0, 255, 0, 0))',
          }}
        />
      )}
    </div>
  );
}

export default function DatastreamPanel() {
  const { telemetry } = useTelemetry();

  const [gforceSamples, setGforceSamples] = useState<GForceSample[]>([]);
  const [peakG, setPeakG] = useState(0);
  const [fpsMeter, setFpsMeter] = useState(0);
  const lastFrameTimeRef = useRef(performance.now());
  const fpsQueueRef = useRef<number[]>([]);

  // Update G-force samples
  useEffect(() => {
    const sample: GForceSample = {
      latG: telemetry.latG,
      longG: telemetry.longG,
      timestamp: performance.now(),
    };

    setGforceSamples((prev) => {
      const updated = [...prev, sample];
      // Keep last 40 samples
      return updated.slice(-40);
    });

    const totalG = Math.sqrt(telemetry.latG ** 2 + telemetry.longG ** 2);
    setPeakG((prev) => Math.max(prev, totalG));
  }, [telemetry.latG, telemetry.longG]);

  // FPS counter
  useEffect(() => {
    const now = performance.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    if (frameTime > 0) {
      const fps = 1000 / frameTime;
      fpsQueueRef.current.push(fps);

      // Keep rolling average of last 30 frames
      if (fpsQueueRef.current.length > 30) {
        fpsQueueRef.current.shift();
      }

      const avgFps = fpsQueueRef.current.reduce((a, b) => a + b, 0) / fpsQueueRef.current.length;
      setFpsMeter(Math.round(avgFps));
    }
  }, []);

  return (
    <div className={`${styles.datastreamPanel} ${styles.dsTopRight}`}>
      <div className={styles.dsInner}>
        {/* G-Force Section */}
        <div className={styles.dsGforce}>
          <GForceDiamond
            latG={telemetry.latG}
            longG={telemetry.longG}
            samples={gforceSamples}
            peakG={peakG}
          />
          <div className={styles.dsValues}>
            <div className={styles.dsValueItem}>
              <div className={styles.dsLabel}>Lat</div>
              <div className={styles.dsValue}>{telemetry.latG.toFixed(2)}</div>
            </div>
            <div className={styles.dsValueItem}>
              <div className={styles.dsLabel}>Long</div>
              <div className={styles.dsValue}>{telemetry.longG.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Yaw Rate Section */}
        <div className={styles.dsItem}>
          <div className={styles.dsLabel}>Yaw Rate</div>
          <YawRateBar yawRate={telemetry.yawRate} />
          <div className={styles.dsValue}>{telemetry.yawRate.toFixed(1)}°/s</div>
        </div>

        {/* Steer Torque */}
        <div className={styles.dsItem}>
          <div className={styles.dsLabel}>Steer Torque</div>
          <div className={styles.dsValue}>{telemetry.steerTorque.toFixed(1)}Nm</div>
        </div>

        {/* Lap Delta */}
        <div className={styles.dsItem}>
          <div className={styles.dsLabel}>Lap Delta</div>
          <div className={`${styles.dsValue} ${
            telemetry.lapDelta < 0 ? styles.dsNegative :
            telemetry.lapDelta > 0 ? styles.dsPositive :
            styles.dsNeutral
          }`}>
            {telemetry.lapDelta > 0 ? '+' : ''}{telemetry.lapDelta.toFixed(3)}s
          </div>
        </div>

        {/* Track Temp */}
        <div className={styles.dsItem}>
          <div className={styles.dsLabel}>Track Temp</div>
          <div className={styles.dsValue}>{telemetry.trackTemp.toFixed(0)}°C</div>
        </div>

        {/* ABS / TC Indicators */}
        <div className={styles.dsItem}>
          <div className={styles.dsLabel}>ABS</div>
          <div className={`${styles.dsValue} ${telemetry.absActive ? styles.dsPositive : styles.dsNeutral}`}>
            {telemetry.absActive ? 'ACTIVE' : 'OFF'}
          </div>
        </div>

        <div className={styles.dsItem}>
          <div className={styles.dsLabel}>TC</div>
          <div className={`${styles.dsValue} ${telemetry.tcActive ? styles.dsPositive : styles.dsNeutral}`}>
            {telemetry.tcActive ? 'ACTIVE' : 'OFF'}
          </div>
        </div>

        {/* FPS Meter */}
        <div className={styles.dsItem}>
          <div className={styles.dsLabel}>FPS</div>
          <div className={styles.dsValue}>{fpsMeter}</div>
        </div>
      </div>
    </div>
  );
}
