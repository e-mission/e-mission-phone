import i18next from 'i18next';
import { DeviceInfo } from './userProfile';

/**
 * @returns Promise that resolves to an object with information about the device and
 * app installation, or rejects if the device settings cannot be read
 */
export async function getDeviceSettings(): Promise<DeviceInfo> {
  const appVersionNumber = await window['cordova'].getAppVersion.getVersionNumber();
  return {
    phone_lang: i18next.resolvedLanguage || 'en',
    curr_platform: window['cordova'].platformId,
    manufacturer: window['device'].manufacturer,
    model: window['device'].model,
    client_os_version: window['device'].version,
    client_app_version: appVersionNumber,
  };
}
