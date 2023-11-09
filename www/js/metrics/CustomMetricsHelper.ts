import angular from 'angular';
import { getLabelOptions } from '../survey/multilabel/confirmHelper';
import { getConfig } from '../config/dynamicConfig';
import { displayError, displayErrorMsg, logDebug } from '../plugin/logger';
import { standardMETs } from './metDataset';

let _customMETs;
let _customPerKmFootprint;
let _range_limited_motorized;
let _inputParams;

export const getCustomMETs = function () {
  logDebug('Getting custom METs ' + JSON.stringify(_customMETs));
  return _customMETs;
};

export const getCustomFootprint = function () {
  logDebug('Getting custom footprint ' + JSON.stringify(_customPerKmFootprint));
  return _customPerKmFootprint;
};

export const getRangeLimitedMotorized = function () {
  logDebug('Getting range limited motorized ' + JSON.stringify(_range_limited_motorized));
  return _range_limited_motorized;
};

const populateCustomMETs = function () {
  let modeOptions = _inputParams['MODE'];
  let modeMETEntries = modeOptions.map((opt) => {
    if (opt.met_equivalent) {
      let currMET = standardMETs[opt.met_equivalent];
      return [opt.value, currMET];
    } else {
      if (opt.met) {
        let currMET = opt.met;
        // if the user specifies a custom MET, they can't specify
        // Number.MAX_VALUE since it is not valid JSON
        // we assume that they specify -1 instead, and we will
        // map -1 to Number.MAX_VALUE here by iterating over all the ranges
        for (const rangeName in currMET) {
          // console.log("Handling range ", rangeName);
          currMET[rangeName].range = currMET[rangeName].range.map((i) =>
            i == -1 ? Number.MAX_VALUE : i,
          );
        }
        return [opt.value, currMET];
      } else {
        console.warn(
          'Did not find either met_equivalent or met for ' + opt.value + ' ignoring entry',
        );
        return undefined;
      }
    }
  });
  _customMETs = Object.fromEntries(modeMETEntries.filter((e) => angular.isDefined(e)));
  logDebug('After populating, custom METs = ' + JSON.stringify(_customMETs));
};

const populateCustomFootprints = function () {
  let modeOptions = _inputParams['MODE'];
  let modeCO2PerKm = modeOptions
    .map((opt) => {
      if (opt.range_limit_km) {
        if (_range_limited_motorized) {
          displayErrorMsg(
            JSON.stringify({ first: _range_limited_motorized, second: opt }),
            'Found two range limited motorized options',
          );
        }
        _range_limited_motorized = opt;
        console.log('Found range limited motorized mode', _range_limited_motorized);
      }
      if (angular.isDefined(opt.kgCo2PerKm)) {
        return [opt.value, opt.kgCo2PerKm];
      } else {
        return undefined;
      }
    })
    .filter((modeCO2) => angular.isDefined(modeCO2));
  _customPerKmFootprint = Object.fromEntries(modeCO2PerKm);
  logDebug('After populating, custom perKmFootprint' + JSON.stringify(_customPerKmFootprint));
};

export const initCustomDatasetHelper = async function (newConfig) {
  newConfig = await getConfig();
  try {
    getLabelOptions(newConfig).then((inputParams) => {
      console.log('Input params = ', inputParams);
      _inputParams = inputParams;
      populateCustomMETs();
      populateCustomFootprints();
    });
  } catch (e) {
    setTimeout(() => {
      displayError(e, 'Error while initializing custom dataset helper');
    }, 1000);
  }
};
