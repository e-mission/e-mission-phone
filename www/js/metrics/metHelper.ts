import { logDebug, logWarn } from '../plugin/logger';
import { getCustomMETs } from './customMetricsHelper';
import { standardMETs } from './metDataset';

let useCustom = false;

/**
 * @function sets boolean to use custom mets
 * @param {boolean} val
 */
export const setUseCustomMET = function (val: boolean) {
  useCustom = val;
};

/**
 * @function gets the METs object
 * @returns {object} mets either custom or standard
 */
const getMETs = function () {
  if (useCustom == true) {
    return getCustomMETs();
  } else {
    return standardMETs;
  }
};

/**
 * @function checks number agains bounds
 * @param num the number to check
 * @param min lower bound
 * @param max upper bound
 * @returns {boolean} if number is within given bounds
 */
const between = function (num, min, max) {
  return num >= min && num <= max;
};

/**
 * @function converts meters per second to miles per hour
 * @param mps meters per second speed
 * @returns speed in miles per hour
 */
const mpstomph = function (mps) {
  return 2.23694 * mps;
};

/**
 * @function gets met for a given mode and speed
 * @param {string} mode of travel
 * @param {number} speed of travel in meters per second
 * @param {number} defaultIfMissing default MET if mode not in METs
 * @returns
 */
export const getMet = function (mode, speed, defaultIfMissing) {
  if (mode == 'ON_FOOT') {
    logDebug("getMet() converted 'ON_FOOT' to 'WALKING'");
    mode = 'WALKING';
  }
  let currentMETs = getMETs();
  if (!currentMETs[mode]) {
    logWarn('getMet() Illegal mode: ' + mode);
    return defaultIfMissing; //So the calorie sum does not break with wrong return type
  }
  for (var i in currentMETs[mode]) {
    if (between(mpstomph(speed), currentMETs[mode][i].range[0], currentMETs[mode][i].range[1])) {
      return currentMETs[mode][i].mets;
    } else if (mpstomph(speed) < 0) {
      logWarn('getMet() Negative speed: ' + mpstomph(speed));
      return 0;
    }
  }
};
