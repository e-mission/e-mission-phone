import { getLabelOptions } from '../survey/multilabel/confirmHelper';
import { displayError, logDebug, logWarn } from '../plugin/logger';
import { standardMETs } from './metDataset';
import { AppConfig } from '../types/appConfigTypes';

//variables to store values locally
let _customMETs: { [key: string]: { [key: string]: { range: number[]; met: number } } };
let _customPerKmFootprint: { [key: string]: number };
let _labelOptions;

/**
 * ONLY USED IN TESTING
 * @function clears the locally stored variables
 */
export function _test_clearCustomMetrics() {
  _customMETs = undefined;
  _customPerKmFootprint = undefined;
  _labelOptions = undefined;
}

/**
 * @function gets custom mets, must be initialized
 * @returns the custom mets stored locally
 */
export function getCustomMETs() {
  logDebug('Getting custom METs ' + JSON.stringify(_customMETs));
  return _customMETs;
}

/**
 * @function gets the custom footprint, must be initialized
 * @returns custom footprint
 */
export function getCustomFootprint() {
  logDebug('Getting custom footprint ' + JSON.stringify(_customPerKmFootprint));
  return _customPerKmFootprint;
}

/**
 * @function stores custom mets in local var
 * needs _labelOptions, stored after gotten from config
 */
function populateCustomMETs() {
  let modeOptions = _labelOptions['MODE'];
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
          currMET[rangeName].range = currMET[rangeName].range.map((i) =>
            i == -1 ? Number.MAX_VALUE : i,
          );
        }
        return [opt.value, currMET];
      } else {
        logWarn(`Did not find either met_equivalent or met for ${opt.value} ignoring entry`);
        return undefined;
      }
    }
  });
  _customMETs = Object.fromEntries(modeMETEntries.filter((e) => typeof e !== 'undefined'));
  logDebug('After populating, custom METs = ' + JSON.stringify(_customMETs));
}

/**
 * @function stores custom footprint in local var
 * needs _inputParams which is stored after gotten from config
 */
function populateCustomFootprints() {
  let modeOptions = _labelOptions['MODE'];
  let modeCO2PerKm = modeOptions
    .map((opt) => {
      if (typeof opt.kgCo2PerKm !== 'undefined') {
        return [opt.value, opt.kgCo2PerKm];
      } else {
        return undefined;
      }
    })
    .filter((modeCO2) => typeof modeCO2 !== 'undefined');
  _customPerKmFootprint = Object.fromEntries(modeCO2PerKm);
  logDebug('After populating, custom perKmFootprint' + JSON.stringify(_customPerKmFootprint));
}

/**
 * @function initializes the datasets based on configured label options
 * calls popuplateCustomMETs and populateCustomFootprint
 * @param newConfig the app config file
 */
export async function initCustomDatasetHelper(newConfig: AppConfig) {
  try {
    logDebug('initializing custom datasets');
    const labelOptions = await getLabelOptions(newConfig);
    _labelOptions = labelOptions;
    populateCustomMETs();
    populateCustomFootprints();
  } catch (e) {
    setTimeout(() => {
      displayError(e, 'Error while initializing custom dataset helper');
    }, 1000);
  }
}
