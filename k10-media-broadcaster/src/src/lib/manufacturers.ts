/**
 * Car manufacturer detection and branding utilities.
 */

/**
 * Detect manufacturer from car model string.
 * @param model - Car model name
 * @returns Manufacturer key (lowercase) or 'unknown'
 */
export function detectMfr(model: string): string {
  if (!model) return 'unknown';

  const lower = model.toLowerCase();

  // BMW
  if (lower.includes('bmw')) return 'bmw';

  // Porsche
  if (lower.includes('porsche')) return 'porsche';

  // Ferrari
  if (lower.includes('ferrari')) return 'ferrari';

  // Lamborghini
  if (lower.includes('lamborghini') || lower.includes('lambo')) return 'lamborghini';

  // Aston Martin
  if (lower.includes('aston')) return 'aston-martin';

  // Mercedes
  if (lower.includes('mercedes')) return 'mercedes';

  // Lexus
  if (lower.includes('lexus')) return 'lexus';

  // Nissan
  if (lower.includes('nissan')) return 'nissan';

  // Honda
  if (lower.includes('honda')) return 'honda';

  // Mazda
  if (lower.includes('mazda')) return 'mazda';

  // Toyota
  if (lower.includes('toyota')) return 'toyota';

  // Subaru
  if (lower.includes('subaru')) return 'subaru';

  // Hyundai
  if (lower.includes('hyundai')) return 'hyundai';

  // Ducati
  if (lower.includes('ducati')) return 'ducati';

  return 'unknown';
}

/**
 * Brand color map for manufacturer display.
 * Maps manufacturer key to HSL color values for branding.
 */
export const MFR_BRAND_COLORS: Record<string, { h: number; s: number; l: number }> = {
  bmw: { h: 0, s: 0, l: 100 }, // white
  porsche: { h: 0, s: 100, l: 50 }, // red
  ferrari: { h: 0, s: 100, l: 50 }, // red
  'aston-martin': { h: 120, s: 60, l: 35 }, // green
  lamborghini: { h: 42, s: 100, l: 50 }, // gold/yellow
  mercedes: { h: 0, s: 0, l: 100 }, // white/silver
  lexus: { h: 0, s: 0, l: 100 }, // white
  nissan: { h: 0, s: 0, l: 100 }, // white
  honda: { h: 0, s: 0, l: 100 }, // white
  mazda: { h: 0, s: 0, l: 100 }, // white
  toyota: { h: 0, s: 0, l: 100 }, // white
  subaru: { h: 240, s: 100, l: 50 }, // blue
  hyundai: { h: 0, s: 0, l: 100 }, // white
  ducati: { h: 0, s: 100, l: 50 }, // red
  unknown: { h: 0, s: 0, l: 70 }, // gray
};

/**
 * Logo display order. Manufacturers appearing later take precedence.
 */
export const LOGO_ORDER = [
  'bmw',
  'porsche',
  'ferrari',
  'aston-martin',
  'lamborghini',
  'mercedes',
  'lexus',
  'nissan',
  'honda',
  'mazda',
  'toyota',
  'subaru',
  'hyundai',
  'ducati',
];

/**
 * Demo mode car models for testing.
 */
export const DEMO_MODELS: Record<string, string> = {
  bmw: 'BMW M4 GT3',
  porsche: 'Porsche 911 GT3 R',
  ferrari: 'Ferrari 488 GT3 Evo',
  'aston-martin': 'Aston Martin DBR9',
  lamborghini: 'Lamborghini Huracán GT3 Evo',
  mercedes: 'Mercedes-AMG GT3',
  lexus: 'Lexus RC F GT3',
  nissan: 'Nissan Z GT500',
  honda: 'Honda NSX GT3',
  mazda: 'Mazda RX-7 Vision GT',
  toyota: 'Toyota GR Corolla',
  subaru: 'Subaru BRZ GT300',
  hyundai: 'Hyundai Elantra N TCR',
  ducati: 'Ducati Panigale V4 R',
};

/**
 * Get the HSL color string for a manufacturer.
 * @param mfrKey - Manufacturer key
 * @returns HSL color string like "hsla(0, 100%, 50%, 1)"
 */
export function getMfrColor(mfrKey: string): string {
  const color = MFR_BRAND_COLORS[mfrKey] ?? MFR_BRAND_COLORS['unknown'];
  if (!color) return 'hsla(0, 0%, 12%, 1)';
  return `hsla(${color.h}, ${color.s}%, ${color.l}%, 1)`;
}

/**
 * Get demo model name for a manufacturer.
 * @param mfrKey - Manufacturer key
 * @returns Demo model name or empty string
 */
export function getDemoModel(mfrKey: string): string {
  return DEMO_MODELS[mfrKey] || '';
}

/**
 * Type for manufacturer detection result.
 */
export interface ManufacturerInfo {
  key: string;
  displayName: string;
  color: string;
  demoModel: string;
}

/**
 * Get full manufacturer info object.
 * @param model - Car model string
 * @returns Manufacturer info object
 */
export function getMfrInfo(model: string): ManufacturerInfo {
  const key = detectMfr(model);
  const displayName = key.charAt(0).toUpperCase() + key.slice(1).replace('-', ' ');
  return {
    key,
    displayName,
    color: getMfrColor(key),
    demoModel: getDemoModel(key),
  };
}
