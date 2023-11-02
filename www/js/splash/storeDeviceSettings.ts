
import { updateUser } from '../commHelper';
import { isConsented, readConsentState } from "./startprefs";
import i18next from 'i18next';
import { displayError, logDebug } from '../plugin/logger';
import { readIntroDone } from '../onboarding/onboardingHelper';
import { subscribe, EVENT_NAMES } from '../customEventHandler';

const storeDeviceSettings = function () {
  var lang = i18next.resolvedLanguage;
  var manufacturer = window['device'].manufacturer;
  var osver = window['device'].version;
  return window['cordova'].getAppVersion.getVersionNumber().then(function (appver) {
    var updateJSON = {
      phone_lang: lang,
      curr_platform: window['cordova'].platformId,
      manufacturer: manufacturer,
      client_os_version: osver,
      client_app_version: appver
    };
    logDebug("About to update profile with settings = " + JSON.stringify(updateJSON));
    return updateUser(updateJSON);
  }).then(function (updateJSON) {
    // alert("Finished saving token = "+JSON.stringify(t.token));
  }).catch(function (error) {
    displayError(error, "Error in updating profile to store device settings");
  });
}

/**
 * @function stores device settings on reconsent
 * @param event that called this function
 * @param data data from the conesnt event
 */
 const onConsentEvent = function (event, data) {
  console.log("got consented event " + JSON.stringify(event['name'])
    + " with data " + JSON.stringify(data));
  readIntroDone()
    .then((isIntroDone) => {
      if (isIntroDone) {
        logDebug("intro is done -> reconsent situation, we already have a token -> store device settings");
        storeDeviceSettings();
      }
    });
}

/**
 * @function stores device settings after intro received
 * @param event that called this function
 * @param data from the event
 */
const onIntroEvent = function (event, data) {
  logDebug("intro is done -> original consent situation, we should have a token by now -> store device settings");
  storeDeviceSettings();
}

export const initStoreDeviceSettings = function () {
  readConsentState()
    .then(isConsented)
    .then(function (consentState) {
      if (consentState == true) {
        storeDeviceSettings();
      } else {
        logDebug("no consent yet, waiting to store device settings in profile");
      }
      subscribe(EVENT_NAMES.CONSENTED_EVENT, (event) => onConsentEvent(event, event.detail));
      subscribe(EVENT_NAMES.INTRO_DONE_EVENT, (event) => onIntroEvent(event, event.detail));
    });
  logDebug("storedevicesettings startup done");
}
