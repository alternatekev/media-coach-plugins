import { describe, it, expect } from 'vitest';
import {
  detectMfr,
  getMfrColor,
  getDemoModel,
  getMfrInfo,
  MFR_BRAND_COLORS,
  LOGO_ORDER,
} from '../lib/manufacturers';

describe('manufacturers', () => {
  describe('detectMfr', () => {
    it('should detect BMW', () => {
      expect(detectMfr('BMW M4 GT3')).toBe('bmw');
      expect(detectMfr('bmw m4')).toBe('bmw');
      expect(detectMfr('BMW')).toBe('bmw');
    });

    it('should detect Porsche', () => {
      expect(detectMfr('Porsche 911 GT3 R')).toBe('porsche');
      expect(detectMfr('porsche')).toBe('porsche');
    });

    it('should detect Ferrari', () => {
      expect(detectMfr('Ferrari 488 GT3 Evo')).toBe('ferrari');
      expect(detectMfr('ferrari')).toBe('ferrari');
    });

    it('should detect Lamborghini', () => {
      expect(detectMfr('Lamborghini Huracán GT3')).toBe('lamborghini');
      expect(detectMfr('lamborghini')).toBe('lamborghini');
    });

    it('should detect Lamborghini with shorthand', () => {
      expect(detectMfr('Lambo GT3')).toBe('lamborghini');
      expect(detectMfr('lambo')).toBe('lamborghini');
    });

    it('should detect Aston Martin', () => {
      expect(detectMfr('Aston Martin DBR9')).toBe('aston-martin');
      expect(detectMfr('aston martin')).toBe('aston-martin');
    });

    it('should detect Mercedes', () => {
      expect(detectMfr('Mercedes-AMG GT3')).toBe('mercedes');
      expect(detectMfr('mercedes')).toBe('mercedes');
    });

    it('should detect Lexus', () => {
      expect(detectMfr('Lexus RC F GT3')).toBe('lexus');
      expect(detectMfr('lexus')).toBe('lexus');
    });

    it('should detect Nissan', () => {
      expect(detectMfr('Nissan Z GT500')).toBe('nissan');
      expect(detectMfr('nissan')).toBe('nissan');
    });

    it('should detect Honda', () => {
      expect(detectMfr('Honda NSX GT3')).toBe('honda');
      expect(detectMfr('honda')).toBe('honda');
    });

    it('should detect Mazda', () => {
      expect(detectMfr('Mazda RX-7 Vision GT')).toBe('mazda');
      expect(detectMfr('mazda')).toBe('mazda');
    });

    it('should detect Toyota', () => {
      expect(detectMfr('Toyota GR Corolla')).toBe('toyota');
      expect(detectMfr('toyota')).toBe('toyota');
    });

    it('should detect Subaru', () => {
      expect(detectMfr('Subaru BRZ GT300')).toBe('subaru');
      expect(detectMfr('subaru')).toBe('subaru');
    });

    it('should detect Hyundai', () => {
      expect(detectMfr('Hyundai Elantra N TCR')).toBe('hyundai');
      expect(detectMfr('hyundai')).toBe('hyundai');
    });

    it('should detect Ducati', () => {
      expect(detectMfr('Ducati Panigale V4 R')).toBe('ducati');
      expect(detectMfr('ducati')).toBe('ducati');
    });

    it('should return unknown for unrecognized brands', () => {
      expect(detectMfr('Unknown Car')).toBe('unknown');
      expect(detectMfr('Generic Vehicle')).toBe('unknown');
    });

    it('should return unknown for empty string', () => {
      expect(detectMfr('')).toBe('unknown');
    });

    it('should return unknown for null/undefined', () => {
      expect(detectMfr(null as any)).toBe('unknown');
      expect(detectMfr(undefined as any)).toBe('unknown');
    });

    it('should handle case-insensitive detection', () => {
      expect(detectMfr('BMW m4')).toBe('bmw');
      expect(detectMfr('FERRARI 488')).toBe('ferrari');
      expect(detectMfr('PoRsChe 911')).toBe('porsche');
    });
  });

  describe('getMfrColor', () => {
    it('should return valid hsla color for known brands', () => {
      const bmwColor = getMfrColor('bmw');
      expect(bmwColor).toMatch(/^hsla\(\d+, \d+%, \d+%, 1\)$/);
      expect(bmwColor).toBe('hsla(0, 0%, 100%, 1)');
    });

    it('should return red for Porsche', () => {
      expect(getMfrColor('porsche')).toBe('hsla(0, 100%, 50%, 1)');
    });

    it('should return red for Ferrari', () => {
      expect(getMfrColor('ferrari')).toBe('hsla(0, 100%, 50%, 1)');
    });

    it('should return green for Aston Martin', () => {
      expect(getMfrColor('aston-martin')).toBe('hsla(120, 60%, 35%, 1)');
    });

    it('should return gold/yellow for Lamborghini', () => {
      expect(getMfrColor('lamborghini')).toBe('hsla(42, 100%, 50%, 1)');
    });

    it('should return blue for Subaru', () => {
      expect(getMfrColor('subaru')).toBe('hsla(240, 100%, 50%, 1)');
    });

    it('should return fallback gray for unknown brands', () => {
      expect(getMfrColor('unknown')).toBe('hsla(0, 0%, 12%, 1)');
    });

    it('should return fallback gray for undefined keys', () => {
      expect(getMfrColor('nonexistent')).toBe('hsla(0, 0%, 12%, 1)');
    });

    it('should all return valid hsla format', () => {
      const brands = ['bmw', 'porsche', 'ferrari', 'lamborghini', 'unknown'];
      brands.forEach((brand) => {
        const color = getMfrColor(brand);
        expect(color).toMatch(/^hsla\(\d+, \d+%, \d+%, 1\)$/);
      });
    });
  });

  describe('getDemoModel', () => {
    it('should return BMW demo model', () => {
      expect(getDemoModel('bmw')).toBe('BMW M4 GT3');
    });

    it('should return Porsche demo model', () => {
      expect(getDemoModel('porsche')).toBe('Porsche 911 GT3 R');
    });

    it('should return Ferrari demo model', () => {
      expect(getDemoModel('ferrari')).toBe('Ferrari 488 GT3 Evo');
    });

    it('should return Lamborghini demo model', () => {
      expect(getDemoModel('lamborghini')).toBe('Lamborghini Huracán GT3 Evo');
    });

    it('should return Aston Martin demo model', () => {
      expect(getDemoModel('aston-martin')).toBe('Aston Martin DBR9');
    });

    it('should return Mercedes demo model', () => {
      expect(getDemoModel('mercedes')).toBe('Mercedes-AMG GT3');
    });

    it('should return Lexus demo model', () => {
      expect(getDemoModel('lexus')).toBe('Lexus RC F GT3');
    });

    it('should return Nissan demo model', () => {
      expect(getDemoModel('nissan')).toBe('Nissan Z GT500');
    });

    it('should return Honda demo model', () => {
      expect(getDemoModel('honda')).toBe('Honda NSX GT3');
    });

    it('should return Mazda demo model', () => {
      expect(getDemoModel('mazda')).toBe('Mazda RX-7 Vision GT');
    });

    it('should return Toyota demo model', () => {
      expect(getDemoModel('toyota')).toBe('Toyota GR Corolla');
    });

    it('should return Subaru demo model', () => {
      expect(getDemoModel('subaru')).toBe('Subaru BRZ GT300');
    });

    it('should return Hyundai demo model', () => {
      expect(getDemoModel('hyundai')).toBe('Hyundai Elantra N TCR');
    });

    it('should return Ducati demo model', () => {
      expect(getDemoModel('ducati')).toBe('Ducati Panigale V4 R');
    });

    it('should return empty string for unknown brand', () => {
      expect(getDemoModel('unknown')).toBe('');
    });

    it('should return empty string for undefined key', () => {
      expect(getDemoModel('nonexistent')).toBe('');
    });
  });

  describe('getMfrInfo', () => {
    it('should return complete info object for known model', () => {
      const info = getMfrInfo('BMW M4 GT3');
      expect(info).toHaveProperty('key');
      expect(info).toHaveProperty('displayName');
      expect(info).toHaveProperty('color');
      expect(info).toHaveProperty('demoModel');
    });

    it('should detect manufacturer correctly', () => {
      const info = getMfrInfo('BMW M4 GT3');
      expect(info.key).toBe('bmw');
    });

    it('should format display name correctly', () => {
      const info = getMfrInfo('BMW M4 GT3');
      expect(info.displayName).toBe('Bmw');
    });

    it('should format display name with dashes', () => {
      const info = getMfrInfo('Aston Martin DBR9');
      // displayName capitalizes first char and replaces dashes with spaces
      // 'aston-martin' -> 'Aston martin' (only first char capitalized)
      expect(info.displayName).toBe('Aston martin');
    });

    it('should return valid color format', () => {
      const info = getMfrInfo('Ferrari 488 GT3 Evo');
      expect(info.color).toMatch(/^hsla\(\d+, \d+%, \d+%, 1\)$/);
    });

    it('should return demo model name', () => {
      const info = getMfrInfo('Porsche 911 GT3 R');
      expect(info.demoModel).toBe('Porsche 911 GT3 R');
    });

    it('should handle unknown manufacturers', () => {
      const info = getMfrInfo('Unknown Vehicle');
      expect(info.key).toBe('unknown');
      expect(info.displayName).toBe('Unknown');
      expect(info.demoModel).toBe('');
    });
  });

  describe('MFR_BRAND_COLORS', () => {
    it('should be a non-empty object', () => {
      expect(MFR_BRAND_COLORS).toBeDefined();
      expect(typeof MFR_BRAND_COLORS).toBe('object');
      expect(Object.keys(MFR_BRAND_COLORS).length).toBeGreaterThan(0);
    });

    it('should have h, s, l properties for each color', () => {
      Object.values(MFR_BRAND_COLORS).forEach((color) => {
        expect(color).toHaveProperty('h');
        expect(color).toHaveProperty('s');
        expect(color).toHaveProperty('l');
        expect(typeof color.h).toBe('number');
        expect(typeof color.s).toBe('number');
        expect(typeof color.l).toBe('number');
      });
    });

    it('should have valid HSL ranges', () => {
      Object.values(MFR_BRAND_COLORS).forEach((color) => {
        expect(color.h).toBeGreaterThanOrEqual(0);
        expect(color.h).toBeLessThanOrEqual(360);
        expect(color.s).toBeGreaterThanOrEqual(0);
        expect(color.s).toBeLessThanOrEqual(100);
        expect(color.l).toBeGreaterThanOrEqual(0);
        expect(color.l).toBeLessThanOrEqual(100);
      });
    });

    it('should contain unknown as fallback', () => {
      expect(MFR_BRAND_COLORS).toHaveProperty('unknown');
    });

    it('should contain all major manufacturers', () => {
      const manufacturers = [
        'bmw',
        'porsche',
        'ferrari',
        'lamborghini',
        'aston-martin',
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
      manufacturers.forEach((mfr) => {
        expect(MFR_BRAND_COLORS).toHaveProperty(mfr);
      });
    });
  });

  describe('LOGO_ORDER', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(LOGO_ORDER)).toBe(true);
      expect(LOGO_ORDER.length).toBeGreaterThan(0);
    });

    it('should contain only strings', () => {
      LOGO_ORDER.forEach((item) => {
        expect(typeof item).toBe('string');
      });
    });

    it('should contain known manufacturers', () => {
      const expectedManufacturers = [
        'bmw',
        'porsche',
        'ferrari',
        'lamborghini',
        'aston-martin',
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
      expectedManufacturers.forEach((mfr) => {
        expect(LOGO_ORDER).toContain(mfr);
      });
    });

    it('should not contain duplicates', () => {
      const unique = new Set(LOGO_ORDER);
      expect(unique.size).toBe(LOGO_ORDER.length);
    });

    it('should not contain unknown', () => {
      expect(LOGO_ORDER).not.toContain('unknown');
    });
  });
});
