import { useMemo, useEffect, useState } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import styles from './CommentaryPanel.module.css';

/**
 * Parse color string (e.g., "#FF5733" or "rgb(255, 87, 51)") to HSL values
 * for dynamic background tinting.
 */
function getBackgroundColorFromHex(hex: string): string {
  if (!hex) return 'transparent';

  // Simple hex to RGB conversion
  let r = 0,
    g = 0,
    b = 0;

  if (hex.startsWith('#')) {
    const cleanHex = hex.slice(1);
    if (cleanHex.length === 6) {
      r = parseInt(cleanHex.slice(0, 2), 16);
      g = parseInt(cleanHex.slice(2, 4), 16);
      b = parseInt(cleanHex.slice(4, 6), 16);
    } else if (cleanHex.length === 3) {
      r = parseInt((cleanHex[0] ?? '') + (cleanHex[0] ?? ''), 16);
      g = parseInt((cleanHex[1] ?? '') + (cleanHex[1] ?? ''), 16);
      b = parseInt((cleanHex[2] ?? '') + (cleanHex[2] ?? ''), 16);
    }
  }

  // Convert RGB to HSL
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `hsla(${h}, ${s}%, ${l}%, 0.12)`;
}

export default function CommentaryPanel() {
  const { telemetry } = useTelemetry();
  const [autoScroll, setAutoScroll] = useState(false);

  // Determine if we need auto-scroll animation
  useEffect(() => {
    if (telemetry.commentaryVisible && telemetry.commentaryText) {
      // Simple heuristic: enable auto-scroll if text is longer than ~80 chars
      setAutoScroll(telemetry.commentaryText.length > 80);
    }
  }, [telemetry.commentaryText, telemetry.commentaryVisible]);

  const backgroundColor = useMemo(() => {
    if (!telemetry.commentaryColor) return 'transparent';
    return getBackgroundColorFromHex(telemetry.commentaryColor);
  }, [telemetry.commentaryColor]);

  const isVisible = telemetry.commentaryVisible;

  return (
    <div
      className={`${styles.commentaryCol} ${isVisible ? styles.visible : ''}`}
      style={{
        backgroundColor,
      }}
    >
      <div className={styles.commentaryInner}>
        <div className={styles.commentaryTitle}>{telemetry.commentaryTitle}</div>
        <div className={`${styles.commentaryScroll} ${autoScroll ? styles.autoScroll : ''}`}>
          <div className={styles.commentaryText}>{telemetry.commentaryText}</div>
        </div>
      </div>
    </div>
  );
}
