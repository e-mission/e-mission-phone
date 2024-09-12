import { updateUser } from '../services/commHelper';
import { readConsentState } from './startprefs';
import i18next from 'i18next';
import { displayError, logDebug } from '../plugin/logger';
import { readIntroDone } from '../onboarding/onboardingHelper';
import { subscribe, EVENTS, unsubscribe } from '../customEventHandler';

/**
 * @description Gathers information about the user's device and stores it
 * @returns promise to updateUser in comm settings with device info
 */
function storeDeviceSettings() {
  return window['cordova'].getAppVersion
    .getVersionNumber()
    .then((appver) => {
      const updateJSON = {
        phone_lang: i18next.resolvedLanguage,
        curr_platform: window['cordova'].platformId,
        manufacturer: window['device'].manufacturer,
        client_os_version: window['device'].version,
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
  logDebug(`got consented event ${JSON.stringify(event['name'])} 
    with data ${JSON.stringify(event.detail)}`);
  readIntroDone().then(async (isIntroDone) => {
    if (isIntroDone) {
      logDebug(`intro is done -> reconsent situation, 
        we already have a token -> store device settings`);
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
export async function initStoreDeviceSettings() {
  const consentState = await readConsentState();
  logDebug(`found consent: ${consentState}`);
  if (consentState == true) {
    await storeDeviceSettings();
  } else {
    logDebug('no consent yet, waiting to store device settings in profile');
  }
  subscribe(EVENTS.CONSENTED_EVENT, onConsentEvent);
  subscribe(EVENTS.INTRO_DONE_EVENT, onIntroEvent);
  logDebug('storedevicesettings startup done');
}

export function teardownDeviceSettings() {
  unsubscribe(EVENTS.CONSENTED_EVENT, onConsentEvent);
  unsubscribe(EVENTS.INTRO_DONE_EVENT, onIntroEvent);
}
