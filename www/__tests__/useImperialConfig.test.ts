import { convertDistance, convertSpeed, getImperialConfig } from '../js/config/useImperialConfig';

describe('convertDistance', () => {
  it('should convert meters to kilometers by default', () => {
    expect(convertDistance(1000, false)).toBe(1);
  });

  it('should convert meters to miles when imperial flag is true', () => {
    expect(convertDistance(1609.34, true)).toBeCloseTo(1); // Approximately 1 mile
  });
});

describe('convertSpeed', () => {
  it('should convert meters per second to kilometers per hour by default', () => {
    expect(convertSpeed(10, false)).toBe(36);
  });

  it('should convert meters per second to miles per hour when imperial flag is true', () => {
    expect(convertSpeed(6.7056, true)).toBeCloseTo(15); // Approximately 15 mph
  });
});

describe('getImperialConfig', () => {
  it('gives an ImperialConfig that works in metric units', () => {
    const imperialConfig = getImperialConfig(false);
    expect(imperialConfig.distanceSuffix).toBe('km');
    expect(imperialConfig.speedSuffix).toBe('kmph');
    expect(imperialConfig.convertDistance(10)).toBe(0.01);
    expect(imperialConfig.convertSpeed(20)).toBe(72);
    expect(imperialConfig.getFormattedDistance(10)).toBe('0.01');
    expect(imperialConfig.getFormattedSpeed(20)).toBe('72');
  });

  it('gives an ImperialConfig that works in imperial units', () => {
    const imperialConfig = getImperialConfig(true);
    expect(imperialConfig.distanceSuffix).toBe('mi');
    expect(imperialConfig.speedSuffix).toBe('mph');
    expect(imperialConfig.convertDistance(10)).toBeCloseTo(0.01);
    expect(imperialConfig.convertSpeed(20)).toBeCloseTo(44.74);
    expect(imperialConfig.getFormattedDistance(10)).toBe('0.01');
    expect(imperialConfig.getFormattedSpeed(20)).toBe('44.7');
  });
});
