import DeploymentConfig from 'nrel-openpath-deploy-configs';
import { getUser, updateUser } from '../services/commHelper';
import { initPushNotify } from './pushNotifySettings';
import { getDeviceSettings } from './storeDeviceSettings';
import { logDebug } from '../plugin/logger';

export type UserProfile = {
  // config version
  config_version: DeploymentConfig['version'];

  // device settings
  phone_lang: string;
  curr_platform: string;
  manufacturer: string;
  client_os_version: string;
  client_app_version: string;

  // push notification settings
  device_token: string;
  curr_sync_interval: number;

  // reminder settings (if using local reminder schemes)
  reminder_assignment?: string;
  reminder_join_date?: string;
  reminder_time_of_day?: string;
};

/**
 * Registers the user for push notifications and updates the user profile with
 * updated push notification settings and device settings.
 * @returns Promise that resolves to the updated user profile
 */
export async function registerAndUpdateProfile(appConfig: DeploymentConfig): Promise<UserProfile> {
  logDebug('userProfile: registerAndUpdateProfile called');
  const promiseResults = await Promise.allSettled([
    getUser(),
    initPushNotify(),
    getDeviceSettings(),
  ]);
  let [currUserProfile, pushNotifySettings, deviceSettings] = promiseResults.map((r) =>
    r.status == 'fulfilled' ? r.value : undefined,
  );
  logDebug(`App: registerAndUpdateProfile: currUserProfile = ${JSON.stringify(currUserProfile)}
    pushNotifySettings = ${JSON.stringify(pushNotifySettings)}
    deviceSettings = ${JSON.stringify(deviceSettings)}`);
  const userProfileUpdate = {
    ...pushNotifySettings,
    ...deviceSettings,
    config_version: appConfig.version,
  };
  return updateUserProfile(userProfileUpdate, currUserProfile as UserProfile);
}

export async function updateUserProfile(
  profileUpdate: Partial<UserProfile>,
  currProfile: UserProfile | undefined,
) {
  if (!currProfile) {
    logDebug('App: updateUserProfile called without current profile, fetching from server');
    currProfile = (await getUser()) as UserProfile;
  }
  const updatedProfile = { ...currProfile, ...profileUpdate };
  // update only if the profile will change
  if (JSON.stringify(currProfile) != JSON.stringify(updatedProfile)) {
    logDebug('App: updating user profile with new settings');
    await updateUser(profileUpdate);
  }
  return updatedProfile;
}
