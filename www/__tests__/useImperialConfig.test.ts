import { convertDistance, convertSpeed, formatForDisplay } from '../js/config/useImperialConfig';


// This mock is required, or else the test will dive into the import chain of useAppConfig.ts and fail when it gets to the root
jest.mock('../js/useAppConfig', () => {
  return jest.fn(() => ({
    appConfig: {
      use_imperial: false
    },
    loading: false
  }));
});
  
describe('formatForDisplay', () => {
  it('should round to the nearest integer when value is >= 100', () => {
    expect(formatForDisplay(105)).toBe('105');
    expect(formatForDisplay(119)).toBe('119');
  });

  it('should round to 3 significant digits when 1 <= value < 100', () => {
    expect(formatForDisplay(7.02)).toBe('7.02');
    expect(formatForDisplay(11.3)).toBe('11.3');
  });

  it('should round to 2 decimal places when value < 1', () => {
    expect(formatForDisplay(0.07)).toBe('0.07');
    expect(formatForDisplay(0.75)).toBe('0.75');
  });
});

describe('convertDistance', () => {
  it('should convert meters to kilometers by default', () => {
    expect(convertDistance(1000, false)).toBe(1);
  });

  it('should convert meters to miles when imperial flag is true', () => {
    expect(convertDistance(1609.34, true)).toBe(1); // Approximately 1 mile
  });
});

describe('convertSpeed', () => {
  it('should convert meters per second to kilometers per hour by default', () => {
    expect(convertSpeed(10, false)).toBe(36);
  });

  it('should convert meters per second to miles per hour when imperial flag is true', () => {
    expect(convertSpeed(6.7056, true)).toBe(15); // Approximately 15 mph
  });
});
