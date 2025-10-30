import DeploymentConfig from 'nrel-openpath-deploy-configs';
import { getUser, updateUser } from '../services/commHelper';
import { initPushNotify } from './pushNotifySettings';
import { getDeviceSettings } from './storeDeviceSettings';
import { logDebug } from '../plugin/logger';
import { addStatReading } from '../plugin/clientStats';

export type ReminderPrefs = {
  reminder_assignment: string; // e.g., 'weekly', 'passive
  reminder_join_date: string; // e.g., '2023-05-09'
  reminder_time_of_day: string; // e.g., '21:00'
};

export type DeviceInfo = {
  phone_lang: string; // e.g., 'en'
  curr_platform: string; // e.g., 'ios'
  manufacturer: string; // e.g., 'Apple'
  client_os_version: string; // e.g., '14.4'
  client_app_version: string; // e.g., '3.2.1'
};

export type PushNotifySettings = {
  device_token: string;
  curr_sync_interval: number;
};

export type UserProfile = {
  config_version: DeploymentConfig['version'];
} & PushNotifySettings &
  DeviceInfo &
  Partial<ReminderPrefs>;

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
  ) as [UserProfile | undefined, PushNotifySettings | undefined, DeviceInfo | undefined];
  logDebug(`App: registerAndUpdateProfile: currUserProfile = ${JSON.stringify(currUserProfile)}
    pushNotifySettings = ${JSON.stringify(pushNotifySettings)}
    deviceSettings = ${JSON.stringify(deviceSettings)}`);
  const userProfileUpdate = {
    config_version: appConfig.version,
    ...pushNotifySettings,
    ...deviceSettings,
  };
  return updateUserProfile(userProfileUpdate, currUserProfile as UserProfile);
}

export async function updateUserProfile(
  profileUpdate: Partial<UserProfile>,
  currProfile: UserProfile | null,
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
    addStatReading('update_user_profile', profileUpdate);
  }
  return updatedProfile;
}
