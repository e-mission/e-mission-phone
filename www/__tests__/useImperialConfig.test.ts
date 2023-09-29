import { getFormattedDistanceInKm, getFormattedDistanceInMiles, getKmph, getMph } from '../js/config/useImperialConfig';


// This mock is required, or else the test will dive into the import chain of useAppConfig.ts and fail when it gets to the root
jest.mock('../js/useAppConfig', () => {
  return jest.fn(() => ({
    appConfig: {
      use_imperial: false
    },
    loading: false
  }));
});


describe('getFormattedDistanceInKm', () => {
  it('should format distance in kilometers', () => {
    expect(getFormattedDistanceInKm('1000')).toBe('1.00');
    expect(getFormattedDistanceInKm('1500')).toBe('1.50');
    expect(getFormattedDistanceInKm('500')).toBe('0.50');
    expect(getFormattedDistanceInKm('0')).toBe('0.0');
  });

  it('returns NaN for an empty input', () => {
    expect(getFormattedDistanceInKm('')).toBe('NaN');
  });

  it('returns NaN for a non-numeric input', () => {
    expect(getFormattedDistanceInKm('abc')).toBe('NaN');
  });
});

describe('getFormattedDistanceInMiles', () => {
  it('should format distance in miles', () => {
    expect(getFormattedDistanceInMiles('1609.34')).toBe('1.0');
    expect(getFormattedDistanceInMiles('3218.68')).toBe('2.00');
    expect(getFormattedDistanceInMiles('804.672')).toBe('0.50');
    expect(getFormattedDistanceInKm('0')).toBe('0.0');
  });

  it('returns NaN for an empty input', () => {
    expect(getFormattedDistanceInMiles('')).toBe('NaN');
  });

  it('returns NaN for a non-numeric input', () => {
    expect(getFormattedDistanceInMiles('abc')).toBe('NaN');
  });
});

describe('getKmph', () => {
  it('should convert meters per second to kilometers per hour', () => {
    expect(getKmph('10')).toBe('36.00');
    expect(getKmph('20')).toBe('72.00');
    expect(getKmph('5')).toBe('18.00');
    expect(getKmph('30.0')).toBe('108.00');
  });

  it('returns 0.00 for an empty input', () => {
    expect(getKmph('')).toBe('0.00');
  });

  it('returns NaN for a non-numeric input', () => {
    expect(getKmph('abc')).toBe('NaN');
  });
});

describe('getMph', () => {
  it('should convert meters per second to miles per hour', () => {
    expect(getMph('10')).toBe('22.37');
    expect(getMph('20')).toBe('44.74');
    expect(getMph('5')).toBe('11.18');
  });

  it('returns 0.00 for an empty input', () => {
    expect(getMph('')).toBe('0.00');
  });

  it('returns NaN for a non-numeric input', () => {
    expect(getMph('abc')).toBe('NaN');
  });
});
