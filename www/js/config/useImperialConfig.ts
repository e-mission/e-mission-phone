import React, { useEffect, useState } from "react";
import useAppConfig from "../useAppConfig";
import i18next from "i18next";

const KM_TO_MILES = 0.621371;
const MPS_TO_KMPH = 3.6;

// it might make sense to move this to a more general location in the codebase
/* formatting units for display:
  - if value >= 100, round to the nearest integer
   e.g. "105 mi", "119 kmph"
  - if 1 <= value < 100, round to 3 significant digits
    e.g. "7.02 km", "11.3 mph"
  - if value < 1, round to 2 decimal places
    e.g. "0.07 mi", "0.75 km" */
export const formatForDisplay = (value: number): string => {
  let opts: Intl.NumberFormatOptions = {};
  if (value >= 100)
    opts.maximumFractionDigits = 0;
  else if (value >= 1)
    opts.maximumSignificantDigits = 3;
  else
    opts.maximumFractionDigits = 2;
  return Intl.NumberFormat(i18next.language, opts).format(value);
}

const convertDistance = (distMeters: number, imperial: boolean): number => {
  if (imperial)
    return (distMeters / 1000) * KM_TO_MILES;
  return distMeters / 1000;
}

const convertSpeed = (speedMetersPerSec: number, imperial: boolean): number => {
  if (imperial)
    return speedMetersPerSec * MPS_TO_KMPH * KM_TO_MILES;
  return speedMetersPerSec * MPS_TO_KMPH;
}

export function useImperialConfig() {
  const appConfig = useAppConfig();
  const [useImperial, setUseImperial] = useState(false);

  useEffect(() => {
    if (!appConfig) return;
    setUseImperial(appConfig.display_config.use_imperial);
  }, [appConfig]);

  return {
    distanceSuffix: useImperial ? "mi" : "km",
    speedSuffix: useImperial ? "mph" : "kmph",
    getFormattedDistance: useImperial ? (d) => formatForDisplay(convertDistance(d, true))
                                      : (d) => formatForDisplay(convertDistance(d, false)),
    getFormattedSpeed: useImperial ? (s) => formatForDisplay(convertSpeed(s, true))
                                   : (s) => formatForDisplay(convertSpeed(s, false)),
  }
}
