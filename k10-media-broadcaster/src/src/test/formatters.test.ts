import { describe, it, expect } from 'vitest';
import {
  fmtLap,
  fmtGap,
  getTyreTempClass,
  colorToHue,
  stripBrand,
  fmtPercent,
  fmtDuration,
  fmtSpeed,
  fmtTemp,
  fmtIRating,
  escHtml,
} from '../lib/formatters';

describe('formatters', () => {
  describe('fmtLap', () => {
    it('should format normal lap times', () => {
      expect(fmtLap(83.456)).toBe('1:23.456');
      expect(fmtLap(125.789)).toBe('2:05.789');
    });

    it('should format sub-minute lap times with leading zero', () => {
      expect(fmtLap(45.123)).toBe('0:45.123');
      expect(fmtLap(9.567)).toBe('0:09.567');
    });

    it('should return empty string for zero', () => {
      expect(fmtLap(0)).toBe('');
    });

    it('should return empty string for negative values', () => {
      expect(fmtLap(-10.5)).toBe('');
    });

    it('should return empty string for Infinity', () => {
      expect(fmtLap(Infinity)).toBe('');
    });

    it('should return empty string for NaN', () => {
      expect(fmtLap(NaN)).toBe('');
    });

    it('should handle values with leading zero padding correctly', () => {
      expect(fmtLap(60.001)).toBe('1:00.001');
    });

    it('should handle very large lap times', () => {
      expect(fmtLap(3661.234)).toBe('61:01.234');
    });
  });

  describe('fmtGap', () => {
    it('should format positive gaps with plus sign', () => {
      expect(fmtGap(1.234)).toBe('+1.234s');
      expect(fmtGap(0.567)).toBe('+0.567s');
    });

    it('should format negative gaps with minus sign', () => {
      expect(fmtGap(-0.567)).toBe('-0.567s');
      expect(fmtGap(-5.123)).toBe('-5.123s');
    });

    it('should return empty string for zero', () => {
      expect(fmtGap(0)).toBe('');
    });

    it('should return empty string for NaN', () => {
      expect(fmtGap(NaN)).toBe('');
    });

    it('should return empty string for Infinity', () => {
      expect(fmtGap(Infinity)).toBe('');
      expect(fmtGap(-Infinity)).toBe('');
    });

    it('should always format to 3 decimal places', () => {
      expect(fmtGap(1.2)).toBe('+1.200s');
      expect(fmtGap(-0.5)).toBe('-0.500s');
    });
  });

  describe('getTyreTempClass', () => {
    it('should return tyre-cold for temperatures below 80', () => {
      expect(getTyreTempClass(75)).toBe('tyre-cold');
      expect(getTyreTempClass(0)).toBe('tyre-cold');
    });

    it('should return tyre-warm for temperatures 80-99', () => {
      expect(getTyreTempClass(80)).toBe('tyre-warm');
      expect(getTyreTempClass(90)).toBe('tyre-warm');
      expect(getTyreTempClass(99)).toBe('tyre-warm');
    });

    it('should return tyre-hot for temperatures 100-119', () => {
      expect(getTyreTempClass(100)).toBe('tyre-hot');
      expect(getTyreTempClass(110)).toBe('tyre-hot');
      expect(getTyreTempClass(119)).toBe('tyre-hot');
    });

    it('should return tyre-overtemp for temperatures 120 and above', () => {
      expect(getTyreTempClass(120)).toBe('tyre-overtemp');
      expect(getTyreTempClass(150)).toBe('tyre-overtemp');
    });

    it('should handle boundary values correctly', () => {
      expect(getTyreTempClass(79.9)).toBe('tyre-cold');
      expect(getTyreTempClass(79.99)).toBe('tyre-cold');
    });
  });

  describe('colorToHue', () => {
    it('should convert red to hue 0', () => {
      expect(colorToHue('#FF0000')).toBe(0);
      expect(colorToHue('FF0000')).toBe(0);
    });

    it('should convert green to hue 120', () => {
      expect(colorToHue('#00FF00')).toBe(120);
      expect(colorToHue('00FF00')).toBe(120);
    });

    it('should convert blue to hue 240', () => {
      expect(colorToHue('#0000FF')).toBe(240);
      expect(colorToHue('0000FF')).toBe(240);
    });

    it('should handle colors with or without hash', () => {
      expect(colorToHue('#FFFFFF')).toBe(colorToHue('FFFFFF'));
      expect(colorToHue('#000000')).toBe(colorToHue('000000'));
    });

    it('should return a valid hue for invalid input (padded to 6 chars)', () => {
      // Invalid hex strings get padded to 6 chars, so they will produce some hue value
      const result1 = colorToHue('invalid');
      expect(result1).toBeGreaterThanOrEqual(0);
      expect(result1).toBeLessThanOrEqual(360);

      const result2 = colorToHue('12345');
      expect(result2).toBeGreaterThanOrEqual(0);
      expect(result2).toBeLessThanOrEqual(360);

      // Empty string becomes '000000' (black) which returns 0
      expect(colorToHue('')).toBe(0);
    });

    it('should handle gray colors', () => {
      expect(colorToHue('#808080')).toBe(0);
      expect(colorToHue('#CCCCCC')).toBe(0);
    });

    it('should handle arbitrary colors', () => {
      const hue = colorToHue('#FF8000');
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThanOrEqual(360);
    });
  });

  describe('stripBrand', () => {
    it('should strip BMW brand', () => {
      expect(stripBrand('BMW M4 GT3')).toBe('M4 GT3');
    });

    it('should strip Porsche brand', () => {
      expect(stripBrand('Porsche 911 GT3 R')).toBe('911 GT3 R');
    });

    it('should strip Ferrari brand', () => {
      expect(stripBrand('Ferrari 488 GT3 Evo')).toBe('488 GT3 Evo');
    });

    it('should strip Lamborghini brand', () => {
      expect(stripBrand('Lamborghini Huracán GT3')).toBe('Huracán GT3');
    });

    it('should strip Mercedes brand', () => {
      expect(stripBrand('Mercedes-AMG GT3')).toBe('-AMG GT3');
    });

    it('should handle case-insensitive brand detection', () => {
      expect(stripBrand('bmw m4 gt3')).toBe('m4 gt3');
      expect(stripBrand('PORSCHE 911')).toBe('911');
    });

    it('should return original model for unknown brands', () => {
      expect(stripBrand('Unknown Car Model')).toBe('Unknown Car Model');
    });

    it('should return empty string for empty input', () => {
      expect(stripBrand('')).toBe('');
      expect(stripBrand(null as any)).toBe('');
    });

    it('should trim whitespace after brand', () => {
      expect(stripBrand('BMW   M4 GT3')).toBe('M4 GT3');
    });
  });

  describe('fmtPercent', () => {
    it('should format normalized values (0-1)', () => {
      expect(fmtPercent(0.45)).toBe('45%');
      expect(fmtPercent(0.5)).toBe('50%');
      expect(fmtPercent(1)).toBe('100%');
    });

    it('should format non-normalized values (0-100)', () => {
      expect(fmtPercent(45, false)).toBe('45%');
      expect(fmtPercent(75.5, false)).toBe('76%'); // Rounded to 0 decimals by default
    });

    it('should handle decimal places', () => {
      expect(fmtPercent(0.456, true, 1)).toBe('45.6%');
      expect(fmtPercent(0.456, true, 2)).toBe('45.60%');
    });

    it('should return dash for NaN', () => {
      expect(fmtPercent(NaN)).toBe('—');
    });

    it('should return dash for Infinity', () => {
      expect(fmtPercent(Infinity)).toBe('—');
      expect(fmtPercent(-Infinity)).toBe('—');
    });

    it('should handle zero values', () => {
      expect(fmtPercent(0)).toBe('0%');
      expect(fmtPercent(0, false)).toBe('0%');
    });

    it('should use true as default for isNormalized', () => {
      expect(fmtPercent(0.5)).toBe('50%');
    });
  });

  describe('fmtDuration', () => {
    it('should format hours and minutes', () => {
      expect(fmtDuration(4500)).toBe('1:15:00');
      expect(fmtDuration(3661)).toBe('1:01:01');
    });

    it('should format minutes and seconds', () => {
      expect(fmtDuration(125)).toBe('2:05');
      expect(fmtDuration(65)).toBe('1:05');
    });

    it('should handle zero', () => {
      expect(fmtDuration(0)).toBe('0:00');
    });

    it('should return dash for negative values', () => {
      expect(fmtDuration(-10)).toBe('—');
    });

    it('should return dash for Infinity', () => {
      expect(fmtDuration(Infinity)).toBe('—');
    });

    it('should return dash for NaN', () => {
      expect(fmtDuration(NaN)).toBe('—');
    });

    it('should pad seconds with leading zero', () => {
      expect(fmtDuration(125)).toBe('2:05');
      expect(fmtDuration(3605)).toBe('1:00:05');
    });

    it('should pad minutes with leading zero when hours are present', () => {
      expect(fmtDuration(3661)).toBe('1:01:01');
      expect(fmtDuration(36000)).toBe('10:00:00');
    });
  });

  describe('fmtSpeed', () => {
    it('should return speed in mph by default', () => {
      expect(fmtSpeed(100)).toBe('100');
      expect(fmtSpeed(50)).toBe('50');
    });

    it('should convert to kmh when unit is kmh', () => {
      expect(fmtSpeed(100, 'kmh')).toBe('161'); // Rounded to 0 decimals by default
      expect(fmtSpeed(60, 'kmh')).toBe('97'); // Rounded to 0 decimals by default
    });

    it('should format with decimal places', () => {
      expect(fmtSpeed(100, 'mph', 1)).toBe('100.0');
      expect(fmtSpeed(100, 'kmh', 2)).toBe('160.93');
    });

    it('should return dash for Infinity', () => {
      expect(fmtSpeed(Infinity)).toBe('—');
      expect(fmtSpeed(-Infinity)).toBe('—');
    });

    it('should return dash for NaN', () => {
      expect(fmtSpeed(NaN)).toBe('—');
    });

    it('should handle zero speed', () => {
      expect(fmtSpeed(0)).toBe('0');
    });
  });

  describe('fmtTemp', () => {
    it('should return temperature in Fahrenheit by default', () => {
      expect(fmtTemp(32)).toBe('32°F');
      expect(fmtTemp(212)).toBe('212°F');
    });

    it('should convert to Celsius when unit is c', () => {
      expect(fmtTemp(32, 'c')).toBe('0°C');
      expect(fmtTemp(212, 'c')).toBe('100°C');
    });

    it('should format with decimal places', () => {
      expect(fmtTemp(32, 'c', 1)).toBe('0.0°C');
      expect(fmtTemp(68, 'c', 2)).toBe('20.00°C');
    });

    it('should return dash for Infinity', () => {
      expect(fmtTemp(Infinity)).toBe('—');
      expect(fmtTemp(-Infinity)).toBe('—');
    });

    it('should return dash for NaN', () => {
      expect(fmtTemp(NaN)).toBe('—');
    });

    it('should handle negative temperatures', () => {
      expect(fmtTemp(-40)).toBe('-40°F');
      expect(fmtTemp(-40, 'c')).toBe('-40°C');
    });
  });

  describe('fmtIRating', () => {
    it('should format with comma separators by default', () => {
      expect(fmtIRating(1500)).toBe('1,500');
      expect(fmtIRating(1234567)).toBe('1,234,567');
    });

    it('should abbreviate to k when abbreviated is true and >= 1000', () => {
      expect(fmtIRating(1500, true)).toBe('1.5k');
      expect(fmtIRating(5200, true)).toBe('5.2k');
    });

    it('should not abbreviate for values < 1000', () => {
      expect(fmtIRating(999, true)).toBe('999');
      expect(fmtIRating(500, true)).toBe('500');
    });

    it('should handle zero', () => {
      expect(fmtIRating(0)).toBe('0');
      expect(fmtIRating(0, true)).toBe('0');
    });

    it('should return dash for negative values', () => {
      expect(fmtIRating(-100)).toBe('—');
    });

    it('should return dash for NaN', () => {
      expect(fmtIRating(NaN)).toBe('—');
    });

    it('should return dash for Infinity', () => {
      expect(fmtIRating(Infinity)).toBe('—');
    });

    it('should handle large abbreviated values', () => {
      expect(fmtIRating(99999, true)).toBe('100.0k');
    });
  });

  describe('escHtml', () => {
    it('should escape ampersands', () => {
      expect(escHtml('A & B')).toBe('A &amp; B');
    });

    it('should escape less than signs', () => {
      expect(escHtml('1 < 2')).toBe('1 &lt; 2');
    });

    it('should escape greater than signs', () => {
      expect(escHtml('2 > 1')).toBe('2 &gt; 1');
    });

    it('should escape double quotes', () => {
      expect(escHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(escHtml("It's a test")).toBe('It&#039;s a test');
    });

    it('should escape all special characters together', () => {
      expect(escHtml('<script>alert("XSS & evil")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS &amp; evil&quot;)&lt;/script&gt;'
      );
    });

    it('should return empty string for empty input', () => {
      expect(escHtml('')).toBe('');
    });

    it('should return empty string for falsy input', () => {
      expect(escHtml(null as any)).toBe('');
      expect(escHtml(undefined as any)).toBe('');
    });

    it('should not escape normal characters', () => {
      expect(escHtml('Hello World 123')).toBe('Hello World 123');
    });
  });
});
