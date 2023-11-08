import { getCustomFootprint } from './CustomMetricsHelper';
import { getCurrentCarbonDatasetFootprint } from './CustomMetricsHelper';

var highestFootprint = 0;

var mtokm = function (v) {
  return v / 1000;
};
let useCustom = false;

export const setUseCustomFootprint = function () {
  useCustom = true;
};

const getFootprint = function () {
  if (useCustom == true) {
    return getCustomFootprint();
  } else {
    return getCurrentCarbonDatasetFootprint();
  }
};

const readableFormat = function (v) {
  return v > 999 ? Math.round(v / 1000) + 'k kg CO₂' : Math.round(v) + ' kg CO₂';
};

export const getFootprintForMetrics = function (userMetrics, defaultIfMissing = 0) {
  var footprint = getFootprint();
  var result = 0;
  for (var i in userMetrics) {
    var mode = userMetrics[i].key;
    if (mode == 'ON_FOOT') {
      mode = 'WALKING';
    }

    if (mode in footprint) {
      result += footprint[mode] * mtokm(userMetrics[i].values);
    } else if (mode == 'IN_VEHICLE') {
      result +=
        ((footprint['CAR'] +
          footprint['BUS'] +
          footprint['LIGHT_RAIL'] +
          footprint['TRAIN'] +
          footprint['TRAM'] +
          footprint['SUBWAY']) /
          6) *
        mtokm(userMetrics[i].values);
    } else {
      console.warn(
        'WARNING getFootprintFromMetrics() was requested for an unknown mode: ' +
          mode +
          ' metrics JSON: ' +
          JSON.stringify(userMetrics),
      );
      result += defaultIfMissing * mtokm(userMetrics[i].values);
    }
  }
  return result;
};

const getLowestFootprintForDistance = function (distance) {
  var footprint = getFootprint();
  var lowestFootprint = Number.MAX_SAFE_INTEGER;
  for (var mode in footprint) {
    if (mode == 'WALKING' || mode == 'BICYCLING') {
      // these modes aren't considered when determining the lowest carbon footprint
    } else {
      lowestFootprint = Math.min(lowestFootprint, footprint[mode]);
    }
  }
  return lowestFootprint * mtokm(distance);
};

export const getHighestFootprint = function () {
  if (!highestFootprint) {
    var footprint = getFootprint();
    let footprintList = [];
    for (var mode in footprint) {
      footprintList.push(footprint[mode]);
    }
    highestFootprint = Math.max(...footprintList);
  }
  return highestFootprint;
};

export const getHighestFootprintForDistance = function (distance) {
  return getHighestFootprint() * mtokm(distance);
};

const getLowestMotorizedNonAirFootprint = function (footprint, rlmCO2) {
  var lowestFootprint = Number.MAX_SAFE_INTEGER;
  for (var mode in footprint) {
    if (mode == 'AIR_OR_HSR' || mode == 'air') {
      console.log('Air mode, ignoring');
    } else {
      if (footprint[mode] == 0 || footprint[mode] <= rlmCO2) {
        console.log(
          'Non motorized mode or footprint <= range_limited_motorized',
          mode,
          footprint[mode],
          rlmCO2,
        );
      } else {
        lowestFootprint = Math.min(lowestFootprint, footprint[mode]);
      }
    }
  }
  return lowestFootprint;
};

const getOptimalDistanceRanges = function () {
  const FIVE_KM = 5 * 1000;
  const SIX_HUNDRED_KM = 600 * 1000;
  if (!useCustom) {
    const defaultFootprint = getCurrentCarbonDatasetFootprint();
    const lowestMotorizedNonAir = getLowestMotorizedNonAirFootprint(defaultFootprint);
    const airFootprint = defaultFootprint['AIR_OR_HSR'];
    return [
      { low: 0, high: FIVE_KM, optimal: 0 },
      { low: FIVE_KM, high: SIX_HUNDRED_KM, optimal: lowestMotorizedNonAir },
      { low: SIX_HUNDRED_KM, high: Number.MAX_VALUE, optimal: airFootprint },
    ];
  } else {
    // custom footprint, let's get the custom values
    const customFootprint = getCustomFootprint();
    let airFootprint = customFootprint['air'];
    if (!airFootprint) {
      // 2341 BTU/PMT from
      // https://tedb.ornl.gov/wp-content/uploads/2021/02/TEDB_Ed_39.pdf#page=68
      // 159.25 lb per million BTU from EIA
      // https://www.eia.gov/environment/emissions/co2_vol_mass.php
      // (2341 * (159.25/1000000))/(1.6*2.2) = 0.09975, rounded up a bit
      console.log('No entry for air in ', customFootprint, ' using default');
      airFootprint = 0.1;
    }
    const rlm = CustomDatasetHelper.range_limited_motorized;
    if (!rlm) {
      return [
        { low: 0, high: FIVE_KM, optimal: 0 },
        { low: FIVE_KM, high: SIX_HUNDRED_KM, optimal: lowestMotorizedNonAir },
        { low: SIX_HUNDRED_KM, high: Number.MAX_VALUE, optimal: airFootprint },
      ];
    } else {
      console.log('Found range_limited_motorized mode', rlm);
      const lowestMotorizedNonAir = getLowestMotorizedNonAirFootprint(
        customFootprint,
        rlm.kgCo2PerKm,
      );
      return [
        { low: 0, high: FIVE_KM, optimal: 0 },
        { low: FIVE_KM, high: rlm.range_limit_km * 1000, optimal: rlm.kgCo2PerKm },
        {
          low: rlm.range_limit_km * 1000,
          high: SIX_HUNDRED_KM,
          optimal: lowestMotorizedNonAir,
        },
        { low: SIX_HUNDRED_KM, high: Number.MAX_VALUE, optimal: airFootprint },
      ];
    }
  }
};
