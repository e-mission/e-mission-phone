import { updateUser } from '../commHelper';
import { displayError, logDebug, logInfo } from '../plugin/logger';
import { readConsentState, isConsented } from './startprefs';
import { readIntroDone } from '../onboarding/onboardingHelper';
import i18next from 'i18next';

let _datacollect;

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

export const initDeviceSettings = function () {
  _datacollect = window['cordova'].plugins.BEMDataCollection;
  readConsentState()
    .then(isConsented)
    .then(function (consentState) {
      if (consentState == true) {
        storeDeviceSettings();
      } else {
        logInfo("no consent yet, waiting to store device settings in profile");
      }
    });
  logInfo("storedevicesettings startup done");
}

export const afterConsentStore = function () {
  console.log("in storedevicesettings, executing after consent is received");
  if (readIntroDone()) {
    console.log("intro is done -> reconsent situation, we already have a token -> register");
    storeDeviceSettings();
  }
};

export const afterIntroStore = function () {
  console.log("intro is done -> original consent situation, we should have a token by now -> register");
  storeDeviceSettings();
};

