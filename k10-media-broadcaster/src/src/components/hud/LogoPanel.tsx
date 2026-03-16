import { useState, useEffect } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import { detectMfr, getMfrColor } from '@lib/manufacturers';
import { stripBrand } from '@lib/formatters';
import styles from './LogoPanel.module.css';

interface LogoPanelProps {
  idleMode?: boolean;
}

export default function LogoPanel({ idleMode = false }: LogoPanelProps) {
  const { telemetry } = useTelemetry();

  const [logoSvg, setLogoSvg] = useState<string>('');
  const mfr = detectMfr(telemetry.carModel);
  const mfrColor = getMfrColor(mfr);
  const carModelLabel = stripBrand(telemetry.carModel);

  // Load manufacturer logo SVG on mount and when mfr changes
  useEffect(() => {
    if (!idleMode && mfr && mfr !== 'unknown') {
      const svgPath = `./images/logos/${mfr}.svg`;
      fetch(svgPath)
        .then((res) => {
          if (res.ok) {
            return res.text();
          }
          throw new Error(`Failed to load ${mfr} logo`);
        })
        .then((svg) => {
          setLogoSvg(svg);
        })
        .catch(() => {
          setLogoSvg('');
        });
    } else {
      setLogoSvg('');
    }
  }, [mfr, idleMode]);

  // In idle mode, only render the K10 logo
  if (idleMode) {
    return (
      <div className={styles.logoCol}>
        <div className={styles.logoSquare}>
          <img
            src="./images/branding/logomark.png"
            alt="K10 Media Broadcaster"
            className={styles.logoImg}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.logoCol}>
      <div className={styles.logoSquare}>
        <img
          src="./images/branding/logomark.png"
          alt="K10 Media Broadcaster"
          className={styles.logoImg}
        />
      </div>

      <div
        className={styles.logoSquare}
        style={{ '--bg-logo': mfrColor } as React.CSSProperties}
      >
        <div className={styles.carLogoIcon}>
          {logoSvg ? (
            <div
              dangerouslySetInnerHTML={{ __html: logoSvg }}
              className={styles.carLogoSvg}
            />
          ) : (
            <div className={styles.carLogoPlaceholder}>
              {mfr !== 'unknown' ? mfr.toUpperCase() : '?'}
            </div>
          )}
        </div>
        <div className={styles.carModelLabel}>{carModelLabel}</div>
      </div>
    </div>
  );
}
