import { updateUser } from '../services/commHelper';
import { isConsented, readConsentState } from './startprefs';
import i18next from 'i18next';
import { displayError, logDebug } from '../plugin/logger';
import { readIntroDone } from '../onboarding/onboardingHelper';
import { subscribe, EVENTS, unsubscribe } from '../customEventHandler';

/**
 * @description Gathers information about the user's device and stores it
 * @returns promise to updateUser in comm settings with device info
 */
function storeDeviceSettings() {
  var lang = i18next.resolvedLanguage;
  var manufacturer = window['device'].manufacturer;
  var osver = window['device'].version;
  return window['cordova'].getAppVersion
    .getVersionNumber()
    .then((appver) => {
      var updateJSON = {
        phone_lang: lang,
        curr_platform: window['cordova'].platformId,
        manufacturer: manufacturer,
        client_os_version: osver,
        client_app_version: appver,
      };
      logDebug('About to update profile with settings = ' + JSON.stringify(updateJSON));
      return updateUser(updateJSON);
    })
    .then((updateJSON) => {
      // alert("Finished saving token = "+JSON.stringify(t.token));
    })
    .catch((error) => {
      displayError(error, 'Error in updating profile to store device settings');
    });
}

/**
 * @function stores device settings on reconsent
 * @param event that called this function
 */
function onConsentEvent(event) {
  console.log(
    'got consented event ' +
      JSON.stringify(event['name']) +
      ' with data ' +
      JSON.stringify(event.detail),
  );
  readIntroDone().then(async (isIntroDone) => {
    if (isIntroDone) {
      logDebug(
        'intro is done -> reconsent situation, we already have a token -> store device settings',
      );
      await storeDeviceSettings();
    }
  });
}

/**
 * @function stores device settings after intro received
 * @param event that called this function
 */
async function onIntroEvent(event) {
  logDebug(`intro is done -> original consent situation, 
    we should have a token by now -> store device settings`);
  await storeDeviceSettings();
}

/**
 * @function initializes store device: subscribes to events
 * stores settings if already consented
 */
export function initStoreDeviceSettings() {
  readConsentState()
    .then(isConsented)
    .then(async (consentState) => {
      console.log('found consent', consentState);
      if (consentState == true) {
        await storeDeviceSettings();
      } else {
        logDebug('no consent yet, waiting to store device settings in profile');
      }
      subscribe(EVENTS.CONSENTED_EVENT, onConsentEvent);
      subscribe(EVENTS.INTRO_DONE_EVENT, onIntroEvent);
    });
  logDebug('storedevicesettings startup done');
}

export function teardownDeviceSettings() {
  unsubscribe(EVENTS.CONSENTED_EVENT, onConsentEvent);
  unsubscribe(EVENTS.INTRO_DONE_EVENT, onIntroEvent);
}
