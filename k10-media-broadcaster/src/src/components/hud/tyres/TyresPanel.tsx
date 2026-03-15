import { useMemo } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import { getTyreTempClass } from '@lib/formatters';
import styles from './TyresPanel.module.css';

interface TyreData {
  label: string;
  temp: number;
  wear: number;
}

/**
 * Tyres Panel HUD Component
 * Displays tyre temperatures and wear percentages in a 2x2 grid.
 * - Temperature color coding: cold (blue), warm (green), hot (amber), overtemp (red)
 * - Wear percentage shown as horizontal bar fill
 */
export function TyresPanel() {
  const { telemetry } = useTelemetry();

  const tyres = useMemo((): TyreData[] => [
    { label: 'FL', temp: telemetry.tyreTempFL, wear: telemetry.tyreWearFL },
    { label: 'FR', temp: telemetry.tyreTempFR, wear: telemetry.tyreWearFR },
    { label: 'RL', temp: telemetry.tyreTempRL, wear: telemetry.tyreWearRL },
    { label: 'RR', temp: telemetry.tyreTempRR, wear: telemetry.tyreWearRR },
  ], [
    telemetry.tyreTempFL,
    telemetry.tyreTempFR,
    telemetry.tyreTempRL,
    telemetry.tyreTempRR,
    telemetry.tyreWearFL,
    telemetry.tyreWearFR,
    telemetry.tyreWearRL,
    telemetry.tyreWearRR,
  ]);

  return (
    <div className={styles['tyres-block']}>
      <div className={styles['panel-label']}>Tyres °F</div>

      <div className={styles['tyre-grid']}>
        {tyres.map((tyre) => (
          <div key={tyre.label} className={styles['tyre-item']}>
            <div className={styles['tyre-label']}>
              {tyre.label}
            </div>

            <div
              className={`${styles['tyre-cell']} ${styles[getTyreTempClass(tyre.temp)]}`}
            >
              {tyre.temp > 0 ? Math.round(tyre.temp) : '—'}
            </div>

            <div className={styles['tyre-wear-bar']}>
              <div
                className={styles['tyre-wear-fill']}
                style={{ width: `${Math.min(tyre.wear * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
