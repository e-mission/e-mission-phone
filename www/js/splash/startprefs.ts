import { storageGet, storageSet } from '../plugin/storage';
import { logInfo, logDebug, displayErrorMsg } from '../plugin/logger';
import { INTRO_DONE_KEY } from '../onboarding/onboardingHelper';
import { getAngularService } from "../angular-react-helper";

type StartPrefs = {
  CONSENTED_EVENT: string,
  INTRO_DONE_EVENT: string,
}

export const startPrefs: StartPrefs = {
  CONSENTED_EVENT: "data_collection_consented",
  INTRO_DONE_EVENT: "intro_done",
};

// data collection consented protocol: string, represents the date on
// which the consented protocol was approved by the IRB
const DATA_COLLECTION_CONSENTED_PROTOCOL = 'data_collection_consented_protocol';

let _req_consent;
let _curr_consented;

function writeConsentToNative() {
  //note that this calls to the notification API, 
  //so should not be called until we have notification permissions
  //see https://github.com/e-mission/e-mission-docs/issues/1006
  return window['cordova'].plugins.BEMDataCollection.markConsented(_req_consent);
};

//used in ConsentPage
export function markConsented() {
  logInfo("changing consent from " +
    _curr_consented + " -> " + JSON.stringify(_req_consent));
  // mark in native storage
  return readConsentState().then(writeConsentToNative).then(function (response) {
    // mark in local storage
    storageSet(DATA_COLLECTION_CONSENTED_PROTOCOL,
      _req_consent);
    // mark in local variable as well
    _curr_consented = {..._req_consent};
  });
};

let _is_consented;
//used in onboardingHelper
export function isConsented() {
  if (_curr_consented == null || _curr_consented == "" ||
    _curr_consented.approval_date != _req_consent.approval_date) {
    console.log("Not consented in local storage, need to show consent");
    _is_consented = false;
    return false;
  } else {
    console.log("Consented in local storage, no need to show consent");
    _is_consented = true;
    return true;
  }
}

//used in onboardingHelper
export function readConsentState() {
  // read consent state from the file and populate it
  return fetch("json/startupConfig.json")
    .then(response => response.json())
    .then(function (startupConfigResult) {
      console.log(startupConfigResult);
      _req_consent = startupConfigResult.emSensorDataCollectionProtocol;
      logInfo("required consent version = " + JSON.stringify(_req_consent));
      return storageGet(DATA_COLLECTION_CONSENTED_PROTOCOL);
    }).then(function (kv_store_consent) {
      _curr_consented = kv_store_consent;
      console.assert(((_req_consent != undefined) && (_req_consent != null)), "in readConsentState $rootScope.req_consent", JSON.stringify(_req_consent));
      // we can just launch this, we don't need to wait for it
      checkNativeConsent();
    });
}

//used in ProfileSettings
export function getConsentDocument() {
  return window['cordova'].plugins.BEMUserCache.getDocument("config/consent", false)
    .then(function (resultDoc) {
      if (window['cordova'].plugins.BEMUserCache.isEmptyDoc(resultDoc)) {
        return null;
      } else {
        return resultDoc;
      }
    });
};

function checkNativeConsent() {
  getConsentDocument().then(function (resultDoc) {
    if (resultDoc == null) {
      if (isConsented()) {
        logDebug("Local consent found, native consent missing, writing consent to native");
        displayErrorMsg("Local consent found, native consent missing, writing consent to native");
        return writeConsentToNative();
      } else {
        logDebug("Both local and native consent not found, nothing to sync");
      }
    }
  });
}
