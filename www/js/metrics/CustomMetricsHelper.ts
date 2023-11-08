import angular from 'angular';
import { getLabelOptions } from '../survey/multilabel/confirmHelper';
import { getConfig } from '../config/dynamicConfig';
import { storageGet, storageSet } from '../plugin/storage';
import { displayError, displayErrorMsg, logDebug } from '../plugin/logger';
import { standardMETs } from './metDataset';
import { carbonDatasets } from './carbonDatasets';

const CARBON_DATASET_KEY = 'carbon_dataset_locale';
const defaultCarbonDatasetCode = 'US';

let _customMETs;
let _customPerKmFootprint;
let _range_limited_motorized;
let _inputParams;
let _currentCarbonDatasetCode = defaultCarbonDatasetCode;

// we need to call the method from within a promise in initialize()
// and using this.setCurrentCarbonDatasetLocale doesn't seem to work
const setCurrentCarbonDatasetLocale = function (localeCode) {
  for (var code in carbonDatasets) {
    if (code == localeCode) {
      _currentCarbonDatasetCode = localeCode;
      break;
    }
  }
};

const loadCarbonDatasetLocale = function () {
  return storageGet(CARBON_DATASET_KEY).then(function (localeCode) {
    logDebug('loadCarbonDatasetLocale() obtained value from storage [' + localeCode + ']');
    if (!localeCode) {
      localeCode = defaultCarbonDatasetCode;
      logDebug('loadCarbonDatasetLocale() no value in storage, using [' + localeCode + '] instead');
    }
    setCurrentCarbonDatasetLocale(localeCode);
  });
};

export const saveCurrentCarbonDatasetLocale = function (localeCode) {
  setCurrentCarbonDatasetLocale(localeCode);
  storageSet(CARBON_DATASET_KEY, _currentCarbonDatasetCode);
  logDebug(
    'saveCurrentCarbonDatasetLocale() saved value [' + _currentCarbonDatasetCode + '] to storage',
  );
};

export const getCarbonDatasetOptions = function () {
  var options = [];
  for (var code in carbonDatasets) {
    options.push({
      text: code, //carbonDatasets[code].regionName,
      value: code,
    });
  }
  return options;
};

export const getCurrentCarbonDatasetCode = function () {
  return _currentCarbonDatasetCode;
};

export const getCurrentCarbonDatasetFootprint = function () {
  return carbonDatasets[_currentCarbonDatasetCode].footprintData;
};

export const getCustomMETs = function () {
  console.log('Getting custom METs', _customMETs);
  return _customMETs;
};

export const getCustomFootprint = function () {
  console.log('Getting custom footprint', _customPerKmFootprint);
  return _customPerKmFootprint;
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
  console.log('After populating, custom METs = ', _customMETs);
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
  console.log('After populating, custom perKmFootprint', _customPerKmFootprint);
};

const initCustomDatasetHelper = async function (newConfig) {
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
