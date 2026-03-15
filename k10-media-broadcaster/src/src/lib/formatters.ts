/**
 * Data formatting utilities for display.
 */

/**
 * Format lap time in M:SS.mmm format.
 * @param seconds - Lap time in seconds (float)
 * @returns Formatted string like "1:23.456" or "" if invalid
 */
export function fmtLap(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) {
    return '';
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds - minutes * 60;

  const minStr = String(minutes);
  const secStr = secs < 10 ? '0' : '';
  const msStr = secs.toFixed(3);

  return `${minStr}:${secStr}${msStr}`;
}

/**
 * Format gap in +/-X.Xs format.
 * @param gap - Gap in seconds (positive for behind, negative for ahead)
 * @returns Formatted string like "+1.234s" or "-0.567s" or "" if invalid
 */
export function fmtGap(gap: number): string {
  if (gap === 0 || !isFinite(gap)) {
    return '';
  }

  const sign = gap > 0 ? '+' : '';
  return `${sign}${gap.toFixed(3)}s`;
}

/**
 * Get CSS class name for tyre temperature color coding.
 * @param tempF - Temperature in Fahrenheit
 * @returns CSS class name: 'tyre-cold', 'tyre-warm', 'tyre-hot', 'tyre-overtemp'
 */
export function getTyreTempClass(tempF: number): string {
  if (tempF < 80) return 'tyre-cold';
  if (tempF < 100) return 'tyre-warm';
  if (tempF < 120) return 'tyre-hot';
  return 'tyre-overtemp';
}

/**
 * Convert hex color to hue value (0-360).
 * @param hex - Color in #RRGGBB or RRGGBB format
 * @returns Hue value 0-360, or 0 if invalid
 */
export function colorToHue(hex: string): number {
  // Normalize: remove # and ensure 6 chars
  const h = hex.replace('#', '').padStart(6, '0');
  if (h.length !== 6) return 0;

  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;

  if (delta === 0) {
    hue = 0;
  } else if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue = Math.round((hue * 60 + 360) % 360);
  return hue;
}

/**
 * Escape HTML special characters.
 * @param s - String to escape
 * @returns Escaped string safe for innerHTML
 */
export function escHtml(s: string): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strip manufacturer brand prefix from car model string.
 * @param model - Full car model name (e.g., "BMW M4 GT3", "Porsche 911 GT3 R")
 * @returns Model without brand (e.g., "M4 GT3", "911 GT3 R")
 */
export function stripBrand(model: string): string {
  if (!model) return '';

  const brands = [
    'BMW',
    'Porsche',
    'Aston Martin',
    'Ferrari',
    'Lamborghini',
    'Ducati',
    'Honda',
    'Hyundai',
    'Lexus',
    'Mazda',
    'Mercedes',
    'Nissan',
    'Subaru',
    'Toyota',
  ];

  for (const brand of brands) {
    if (model.toLowerCase().startsWith(brand.toLowerCase())) {
      return model.slice(brand.length).trim();
    }
  }

  return model;
}

/**
 * Format a number as a percentage string with optional decimal places.
 * @param value - Number 0-1 or 0-100
 * @param isNormalized - Whether value is 0-1 (true) or 0-100 (false). Defaults to true.
 * @param decimals - Number of decimal places (default: 0)
 * @returns Percentage string like "45%" or "45.5%"
 */
export function fmtPercent(
  value: number,
  isNormalized = true,
  decimals = 0
): string {
  if (!isFinite(value)) return '—';

  const pct = isNormalized ? value * 100 : value;
  return pct.toFixed(decimals) + '%';
}

/**
 * Format a time duration in HH:MM:SS or MM:SS format.
 * @param seconds - Duration in seconds
 * @returns Formatted string like "1:23:45" or "23:45"
 */
export function fmtDuration(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) {
    return '—';
  }

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format speed with unit conversion and decimal places.
 * @param speedMph - Speed in miles per hour
 * @param unit - 'mph' or 'kmh' (default: 'mph')
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with unit
 */
export function fmtSpeed(
  speedMph: number,
  unit: 'mph' | 'kmh' = 'mph',
  decimals = 0
): string {
  if (!isFinite(speedMph)) {
    return '—';
  }

  const speed = unit === 'kmh' ? speedMph * 1.60934 : speedMph;
  return speed.toFixed(decimals);
}

/**
 * Format temperature with unit conversion.
 * @param tempF - Temperature in Fahrenheit
 * @param unit - 'f' or 'c' (default: 'f')
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with unit
 */
export function fmtTemp(
  tempF: number,
  unit: 'f' | 'c' = 'f',
  decimals = 0
): string {
  if (!isFinite(tempF)) {
    return '—';
  }

  const temp = unit === 'c' ? (tempF - 32) * (5 / 9) : tempF;
  return temp.toFixed(decimals) + '°' + unit.toUpperCase();
}

/**
 * Format iRating with comma separators and optional label.
 * @param iRating - iRating value
 * @param abbreviated - Show as "1.2k" (true) or "1200" (false). Default: false.
 * @returns Formatted string
 */
export function fmtIRating(iRating: number, abbreviated = false): string {
  if (!isFinite(iRating) || iRating < 0) {
    return '—';
  }

  if (abbreviated && iRating >= 1000) {
    return (iRating / 1000).toFixed(1) + 'k';
  }

  return iRating.toLocaleString();
}
