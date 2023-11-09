import { getCustomMETs } from './customMetricsHelper';
import { standardMETs } from './metDataset';

let useCustom = false;

export const setUseCustomMET = function (val: boolean) {
  useCustom = val;
};

const getMETs = function () {
  if (useCustom == true) {
    return getCustomMETs();
  } else {
    return standardMETs;
  }
};

const between = function (num, min, max) {
  return num >= min && num <= max;
};

const mpstomph = function (mps) {
  return 2.23694 * mps;
};

export const getMet = function (mode, speed, defaultIfMissing) {
  if (mode == 'ON_FOOT') {
    console.log("getMet() converted 'ON_FOOT' to 'WALKING'");
    mode = 'WALKING';
  }
  let currentMETs = getMETs();
  if (!currentMETs[mode]) {
    console.warn('getMet() Illegal mode: ' + mode);
    return defaultIfMissing; //So the calorie sum does not break with wrong return type
  }
  for (var i in currentMETs[mode]) {
    if (between(mpstomph(speed), currentMETs[mode][i].range[0], currentMETs[mode][i].range[1])) {
      return currentMETs[mode][i].mets;
    } else if (mpstomph(speed) < 0) {
      console.log('getMet() Negative speed: ' + mpstomph(speed));
      return 0;
    }
  }
};
