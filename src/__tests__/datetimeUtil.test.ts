import { formatForDisplay } from '../js/datetimeUtil';

describe('util.ts', () => {
  describe('formatForDisplay', () => {
    it('should round to the nearest integer when value is >= 100', () => {
      expect(formatForDisplay(105)).toBe('105');
      expect(formatForDisplay(119.01)).toBe('119');
      expect(formatForDisplay(119.91)).toBe('120');
    });

    it('should round to 3 significant digits when 1 <= value < 100', () => {
      expect(formatForDisplay(7.02)).toBe('7.02');
      expect(formatForDisplay(9.6262)).toBe('9.63');
      expect(formatForDisplay(11.333)).toBe('11.3');
      expect(formatForDisplay(99.99)).toBe('100');
    });

    it('should round to 2 decimal places when value < 1', () => {
      expect(formatForDisplay(0.07178)).toBe('0.07');
      expect(formatForDisplay(0.08978)).toBe('0.09');
      expect(formatForDisplay(0.75)).toBe('0.75');
      expect(formatForDisplay(0.001)).toBe('0');
      expect(formatForDisplay(0.006)).toBe('0.01');
      expect(formatForDisplay(0.00001)).toBe('0');
    });
  });
});
