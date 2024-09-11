import React from 'react';
import { convertDistance, convertSpeed, useImperialConfig } from '../js/config/useImperialConfig';

// This mock is required, or else the test will dive into the import chain of useAppConfig.ts and fail when it gets to the root
jest.mock('../js/useAppConfig', () => {
  return jest.fn(() => ({
    display_config: {
      use_imperial: false,
    },
    loading: false,
  }));
});
jest.spyOn(React, 'useState').mockImplementation((initialValue) => [initialValue, jest.fn()]);
jest.spyOn(React, 'useEffect').mockImplementation((effect: () => void) => effect());

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

describe('useImperialConfig', () => {
  it('returns ImperialConfig with imperial units', () => {
    const imperialConfig = useImperialConfig();
    expect(imperialConfig.distanceSuffix).toBe('km');
    expect(imperialConfig.speedSuffix).toBe('kmph');
    expect(imperialConfig.convertDistance(10)).toBe(0.01);
    expect(imperialConfig.convertSpeed(20)).toBe(72);
    expect(imperialConfig.getFormattedDistance(10)).toBe('0.01');
    expect(imperialConfig.getFormattedSpeed(20)).toBe('72');
  });
});
