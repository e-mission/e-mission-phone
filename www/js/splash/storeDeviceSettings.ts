import i18next from 'i18next';
import { displayError } from '../plugin/logger';

/**
 * @returns Promise that resolves to an object with information about the device and
 * app installation, or undefined if an error occurs
 */
export async function getDeviceSettings() {
  try {
    const appVersionNumber = await window['cordova'].getAppVersion.getVersionNumber();
    return {
      phone_lang: i18next.resolvedLanguage,
      curr_platform: window['cordova'].platformId,
      manufacturer: window['device'].manufacturer,
      client_os_version: window['device'].version,
      client_app_version: appVersionNumber,
    };
  } catch (error) {
    displayError(error, 'Error in getting device settings');
  }
}
