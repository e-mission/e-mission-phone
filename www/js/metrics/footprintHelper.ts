import { displayErrorMsg, logDebug, logWarn } from '../plugin/logger';
import { getCustomFootprint } from './customMetricsHelper';

//variables for the highest footprint in the set and if using custom
let highestFootprint: number | undefined = 0;

/**
 * @function converts meters to kilometers
 * @param {number} v value in meters to be converted
 * @returns {number} converted value in km
 */
const mtokm = (v) => v / 1000;

/**
 * @function clears the stored highest footprint
 */
export function clearHighestFootprint() {
  //need to clear for testing
  highestFootprint = undefined;
}

/**
 * @function gets the footprint
 * currently will only be custom, as all labels are "custom"
 * fallback is json/label-options.json.sample, with MET and kgCO2 defined
 * @returns the footprint or undefined
 */
function getFootprint() {
  let footprint = getCustomFootprint();
  if (footprint) {
    return footprint;
  } else {
    throw new Error('In Footprint Calculatins, failed to use custom labels');
  }
}

/**
 * @function calculates footprint for given metrics
 * @param {Array} userMetrics string mode + number distance in meters pairs
 * ex: const custom_metrics = [ { key: 'walk', values: 3000 }, { key: 'bike', values: 6500 }, ];
 * @param {number} defaultIfMissing optional, carbon intensity if mode not in footprint
 * @returns {number} the sum of carbon emissions for userMetrics given
 */
export function getFootprintForMetrics(userMetrics, defaultIfMissing = 0) {
  const footprint = getFootprint();
  logDebug('getting footprint for ' + userMetrics + ' with ' + footprint);
  let result = 0;
  for (let i in userMetrics) {
    let mode = userMetrics[i].key;
    if (mode == 'ON_FOOT') {
      mode = 'WALKING';
    }

    if (mode in footprint) {
      result += footprint[mode] * mtokm(userMetrics[i].values);
    } else if (mode == 'IN_VEHICLE') {
      const sum =
        footprint['CAR'] +
        footprint['BUS'] +
        footprint['LIGHT_RAIL'] +
        footprint['TRAIN'] +
        footprint['TRAM'] +
        footprint['SUBWAY'];
      result += (sum / 6) * mtokm(userMetrics[i].values);
    } else {
      logWarn(
        `WARNING getFootprintFromMetrics() was requested for an unknown mode: ${mode} metrics JSON: ${JSON.stringify(
          userMetrics,
        )}`,
      );
      result += defaultIfMissing * mtokm(userMetrics[i].values);
    }
  }
  return result;
}

/**
 * @function gets highest co2 intensity in the footprint
 * @returns {number} the highest co2 intensity in the footprint
 */
export function getHighestFootprint() {
  if (!highestFootprint) {
    const footprint = getFootprint();
    let footprintList: number[] = [];
    for (let mode in footprint) {
      footprintList.push(footprint[mode]);
    }
    highestFootprint = Math.max(...footprintList);
  }
  return highestFootprint;
}

/**
 * @function gets highest theoretical footprint for given distance
 * @param {number} distance in meters to calculate max footprint
 * @returns max footprint for given distance
 */
export const getHighestFootprintForDistance = (distance) => getHighestFootprint() * mtokm(distance);
