import { storageGet, storageSet } from '../plugin/storage';
import { logInfo, logDebug, displayErrorMsg } from '../plugin/logger';
import { EVENTS, publish } from '../customEventHandler';
import { addStatReading } from '../plugin/clientStats';

// data collection consented protocol: string, represents the date on
// which the consented protocol was approved by the IRB
const DATA_COLLECTION_CONSENTED_PROTOCOL = 'data_collection_consented_protocol';

let _req_consent;
let _curr_consented;

/**
 * @function writes the consent document to native storage
 * @returns Promise to execute the write to storage
 */
function writeConsentToNative() {
  //note that this calls to the notification API,
  //so should not be called until we have notification permissions
  //see https://github.com/e-mission/e-mission-docs/issues/1006
  return window['cordova'].plugins.BEMDataCollection.markConsented(_req_consent);
}

/**
 * @function marks consent in native storage, local storage, and local var
 * @returns Promise for marking the consent in native and local storage
 */
export function markConsented() {
  logInfo('changing consent from ' + _curr_consented + ' -> ' + JSON.stringify(_req_consent));
  // mark in native storage
  return readConsentState()
    .then(writeConsentToNative)
    .then((response) => {
      // mark in local storage
      storageSet(DATA_COLLECTION_CONSENTED_PROTOCOL, _req_consent);
      // mark in local variable as well
      _curr_consented = { ..._req_consent };
      // publish event
      publish(EVENTS.CONSENTED_EVENT, _req_consent);
    })
    .catch((error) => {
      displayErrorMsg(error, 'Error while while wrting consent to storage');
    });
}

/**
 * @function checking for consent locally
 * @returns {boolean} if the consent is marked in the local var
 */
export function isConsented() {
  logDebug('curr consented is' + JSON.stringify(_curr_consented));
  if (
    _curr_consented == null ||
    _curr_consented == '' ||
    _curr_consented.approval_date != _req_consent.approval_date
  ) {
    logDebug('Not consented in local storage, need to show consent');
    return false;
  } else {
    logDebug('Consented in local storage, no need to show consent');
    return true;
  }
}

/**
 * @function reads the consent state from the file and populates it
 * @returns nothing, just reads into local variables
 */
export function readConsentState() {
  return fetch('json/startupConfig.json')
    .then((response) => response.json())
    .then((startupConfigResult) => {
      _req_consent = startupConfigResult.emSensorDataCollectionProtocol;
      logDebug('required consent version = ' + JSON.stringify(_req_consent));
      return storageGet(DATA_COLLECTION_CONSENTED_PROTOCOL);
    })
    .then((kv_store_consent) => {
      _curr_consented = kv_store_consent;
      console.assert(
        _req_consent != undefined && _req_consent != null,
        'in readConsentState $rootScope.req_consent',
        JSON.stringify(_req_consent),
      );
      // we can just launch this, we don't need to wait for it
      checkNativeConsent();
    });
}

/**
 * @function gets the consent document from storage
 * @returns Promise for the consent document or null if the doc is empty
 */
//used in ProfileSettings
export function getConsentDocument() {
  return window['cordova'].plugins.BEMUserCache.getDocument('config/consent', false).then(
    (resultDoc) =>
      window['cordova'].plugins.BEMUserCache.isEmptyDoc(resultDoc) ? null : resultDoc,
  );
}

/**
 * @function checks the consent doc in native storage
 * @returns if doc not stored in native, a promise to write it there
 */
function checkNativeConsent() {
  getConsentDocument().then((resultDoc) => {
    if (resultDoc == null) {
      if (isConsented()) {
        logDebug('Local consent found, native consent missing, writing consent to native');
        addStatReading('missing_keys', {
          type: 'document_mismatch',
          document: 'config/consent',
          localConsent: _curr_consented,
          nativeConsent: resultDoc,
        }).then(logDebug('Logged missing_keys event to client stats for missing native consent'));
        return writeConsentToNative();
      } else {
        logDebug('Both local and native consent not found, nothing to sync');
      }
    }
  });
}
