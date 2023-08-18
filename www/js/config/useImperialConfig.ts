import React, { useEffect, useState } from "react";
import useAppConfig from "../useAppConfig";

const getFormattedDistanceInKm = (dist_in_meters) => {
  if (dist_in_meters >= 1000)
    return Number.parseFloat((dist_in_meters / 1000).toFixed(0));
  return Number.parseFloat((dist_in_meters / 1000).toPrecision(3));
}

const getFormattedDistanceInMiles = (dist_in_meters) =>
  Number.parseFloat((KM_TO_MILES * getFormattedDistanceInKm(dist_in_meters)).toFixed(1));

const getKmph = (metersPerSec) =>
  (metersPerSec * 3.6).toFixed(2);

const getMph = (metersPerSecond) =>
  (KM_TO_MILES * Number.parseFloat(getKmph(metersPerSecond))).toFixed(2);

const KM_TO_MILES = 0.621371;

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
