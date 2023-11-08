import { getCustomMETs } from './customMetricsHelper';
import { standardMETs } from './metDataset';
import { storageGet, storageSet, storageRemove } from '../plugin/storage';

var highestMET = 0;
var USER_DATA_KEY = 'user-data';
let useCustom = false;

const setUseCustomMET = function () {
  useCustom = true;
};

const getMETs = function () {
  if (useCustom == true) {
    return getCustomMETs();
  } else {
    return standardMETs;
  }
};

const set = function (info) {
  return storageSet(USER_DATA_KEY, info);
};

const get = function () {
  return storageGet(USER_DATA_KEY);
};

const remove = function () {
  return storageRemove(USER_DATA_KEY);
};

const between = function (num, min, max) {
  return num >= min && num <= max;
};

const getHighestMET = function () {
  if (!highestMET) {
    var met = getMETs();
    let metList = [];
    for (var mode in met) {
      var rangeList = met[mode];
      for (var range in rangeList) {
        metList.push(rangeList[range].mets);
      }
    }
    highestMET = Math.max(...metList);
  }
  return highestMET;
};

const getMet = function (mode, speed, defaultIfMissing) {
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

const mpstomph = function (mps) {
  return 2.23694 * mps;
};

const lbtokg = function (lb) {
  return lb * 0.453592;
};

const fttocm = function (ft) {
  return ft * 30.48;
};

const getCorrectedMet = function (met, gender, age, height, heightUnit, weight, weightUnit) {
  var height = heightUnit == 0 ? fttocm(height) : height;
  var weight = weightUnit == 0 ? lbtokg(weight) : weight;
  let calcMet;
  if (gender == 1) {
    //male
    calcMet =
      (met * 3.5) /
      (((66.473 + 5.0033 * height + 13.7516 * weight - 6.755 * age) / 1440 / 5 / weight) * 1000);
    return met;
  } else if (gender == 0) {
    //female
    let met =
      (calcMet * 3.5) /
      (((655.0955 + 1.8496 * height + 9.5634 * weight - 4.6756 * age) / 1440 / 5 / weight) * 1000);
    return calcMet;
  }
};

const getuserCalories = function (durationInMin, met) {
  return 65 * durationInMin * met;
};

const getCalories = function (weightInKg, durationInMin, met) {
  return weightInKg * durationInMin * met;
};
