import React, { useEffect, useState } from "react";
import useAppConfig from "../useAppConfig";

const KM_TO_MILES = 0.621371;
/* formatting distances for display:
  - if distance >= 100, round to the nearest integer
   e.g. "105 mi", "167 km"
  - if 1 <= distance < 100, round to 3 significant digits
    e.g. "7.02 mi", "11.3 km"
  - if distance < 1, round to 2 significant digits
    e.g. "0.47 mi", "0.75 km" */
const formatDistance = (dist: number) => {
  if (dist < 1)
    return dist.toPrecision(2);
  if (dist < 100)
    return dist.toPrecision(3);
  return Math.round(dist).toString();
}

const getFormattedDistanceInKm = (distInMeters: string) =>
  formatDistance(Number.parseFloat(distInMeters) / 1000);

const getFormattedDistanceInMiles = (distInMeters: string) =>
  formatDistance((Number.parseFloat(distInMeters) / 1000) * KM_TO_MILES);

const getKmph = (metersPerSec) =>
  (metersPerSec * 3.6).toFixed(2);

const getMph = (metersPerSecond) =>
  (KM_TO_MILES * Number.parseFloat(getKmph(metersPerSecond))).toFixed(2);

export function useImperialConfig() {
  const { appConfig, loading } = useAppConfig();
  const [useImperial, setUseImperial] = useState(false);

  useEffect(() => {
    if (loading) return;
    setUseImperial(appConfig.display_config.use_imperial);
  }, [appConfig, loading]);

  return {
    distanceSuffix: useImperial ? "mi" : "km",
    speedSuffix: useImperial ? "mph" : "kmph",
    getFormattedDistance: useImperial ? getFormattedDistanceInMiles : getFormattedDistanceInKm,
    getFormattedSpeed: useImperial ? getMph : getKmph,
  }
}
