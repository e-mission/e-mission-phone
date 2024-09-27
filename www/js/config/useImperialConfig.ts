import React, { useMemo } from 'react';
import useAppConfig from '../useAppConfig';
import { formatForDisplay } from '../datetimeUtil';

export type ImperialConfig = {
  distanceSuffix: string;
  speedSuffix: string;
  convertDistance: (d: number) => number;
  convertSpeed: (s: number) => number;
  getFormattedDistance: (d: number) => string;
  getFormattedSpeed: (s: number) => string;
};

const KM_TO_MILES = 0.621371;
const MPS_TO_KMPH = 3.6;

export function convertDistance(distMeters: number, imperial: boolean): number {
  if (imperial) return (distMeters / 1000) * KM_TO_MILES;
  return distMeters / 1000;
}

export function convertSpeed(speedMetersPerSec: number, imperial: boolean): number {
  if (imperial) return speedMetersPerSec * MPS_TO_KMPH * KM_TO_MILES;
  return speedMetersPerSec * MPS_TO_KMPH;
}

export const getImperialConfig = (useImperial: boolean): ImperialConfig => ({
  distanceSuffix: useImperial ? 'mi' : 'km',
  speedSuffix: useImperial ? 'mph' : 'kmph',
  convertDistance: (d) => convertDistance(d, useImperial),
  convertSpeed: (s) => convertSpeed(s, useImperial),
  getFormattedDistance: useImperial
    ? (d) => formatForDisplay(convertDistance(d, true))
    : (d) => formatForDisplay(convertDistance(d, false)),
  getFormattedSpeed: useImperial
    ? (s) => formatForDisplay(convertSpeed(s, true))
    : (s) => formatForDisplay(convertSpeed(s, false)),
});

export function useImperialConfig(): ImperialConfig {
  const appConfig = useAppConfig();
  const useImperial = useMemo(() => appConfig?.display_config.use_imperial, [appConfig]);
  return getImperialConfig(useImperial);
}
