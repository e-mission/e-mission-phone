import { useEffect, useState, useMemo } from 'react';
import { AppStateStatus } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from './appTheme';
import { logDebug, logWarn } from './plugin/logger';
import { Alerts } from './components/AlertArea';
import { readConsentState } from './splash/startprefs';
import DeploymentConfig from 'op-deployment-configs';

let DEVICE_PLATFORM: 'android' | 'ios';
let DEVICE_VERSION: number;

type Check = {
  name: string;
  desc: string;
  fix: () => Promise<any>;
  refresh: () => Promise<any>;
  status?: boolean;
  isOptional?: boolean;
  wasRequested?: boolean;
};

const usePermissionStatus = (appState: AppStateStatus, appConfig: DeploymentConfig) => {
  const { t } = useTranslation();
  const [checkList, setCheckList] = useState<Check[]>([]);
  const [explanationList, setExplanationList] = useState<Array<any>>([]);

  const overallStatus = useMemo<boolean | undefined>(() => {
    if (!checkList?.length) return undefined; // if checks not loaded yet, status is undetermined
    return checkList.every((check) => check.status || (check.isOptional && check.wasRequested));
  }, [checkList]);

  //refreshing checks with the plugins to update the check's status
  async function refreshAllChecks(checkList: Check[]) {
    const checkRefreshPromises = checkList.map((check) => check.refresh());
    const newCheckList = await Promise.all(checkRefreshPromises);
    logDebug('All checks refreshed');
    setCheckList(newCheckList);
  }

  async function checkOrFix(check: Check, nativeFn: () => Promise<any>, showError = true) {
    logDebug(`checkOrFix: checking nativeFn ${nativeFn.name} for check ${JSON.stringify(check)}`);
    let newCheck = check;
    try {
      const result = await nativeFn();
      logDebug(`${check.name} result = ${result}`);
      newCheck.status = true;
    } catch (error) {
      if (showError) {
        Alerts.addMessage({ text: error });
      }
      newCheck.status = false;
      newCheck.desc = error;
    }
    return newCheck;
  }

  function getLocSettingsDescriptionTag() {
    if (DEVICE_PLATFORM == 'android') {
      return DEVICE_VERSION < 9
        ? 'intro.appstatus.locsettings.description.android-lt-9'
        : 'intro.appstatus.locsettings.description.android-gte-9';
    } else if (DEVICE_PLATFORM == 'ios') {
      return 'intro.appstatus.locsettings.description.ios';
    }
    throw new Error(`Unknown platform ${DEVICE_PLATFORM} – unable to proceed`);
  }

  function getLocPermissionsDescriptionTag() {
    if (DEVICE_PLATFORM == 'android') {
      if (DEVICE_VERSION < 6) return 'intro.appstatus.locperms.description.android-lt-6';
      if (DEVICE_VERSION < 10) return 'intro.appstatus.locperms.description.android-6-9';
      if (DEVICE_VERSION < 11) return 'intro.appstatus.locperms.description.android-10';
      if (DEVICE_VERSION < 12) return 'intro.appstatus.locperms.description.android-11';
      return 'intro.appstatus.locperms.description.android-gte-12';
    } else if (DEVICE_PLATFORM == 'ios') {
      if (DEVICE_VERSION < 13) return 'intro.appstatus.locperms.description.ios-lt-13';
      if (DEVICE_VERSION < 13.4) return 'intro.appstatus.locperms.description.ios-13-13.3';
      return 'intro.appstatus.locperms.description.ios-gte-13.4';
    }
    throw new Error(`Unknown platform ${DEVICE_PLATFORM} – unable to proceed`);
  }

  function setupLocChecks(): Check[] {
    let locSettingsCheck = {
      name: t('intro.appstatus.locsettings.name'),
      desc: t(getLocSettingsDescriptionTag()),
      fix: () =>
        checkOrFix(
          locSettingsCheck,
          window['cordova'].plugins.BEMDataCollection.fixLocationSettings,
          true,
        ),
      refresh: () =>
        checkOrFix(
          locSettingsCheck,
          window['cordova'].plugins.BEMDataCollection.isValidLocationSettings,
          false,
        ),
    };
    let locPermissionsCheck = {
      name: t('intro.appstatus.locperms.name'),
      desc: t(getLocPermissionsDescriptionTag()),
      fix: () =>
        checkOrFix(
          locPermissionsCheck,
          window['cordova'].plugins.BEMDataCollection.fixLocationPermissions,
          true,
        ),
      refresh: () =>
        checkOrFix(
          locPermissionsCheck,
          window['cordova'].plugins.BEMDataCollection.isValidLocationPermissions,
          false,
        ),
    };

    return [locSettingsCheck, locPermissionsCheck];
  }

  function setupFitnessChecks(): Check[] {
    if (DEVICE_PLATFORM == 'android' && DEVICE_VERSION < 10) {
      logDebug('Android version < 10, skipping fitness checks');
      return [];
    }

    let fitnessPermissionsCheck = {
      name: t('intro.appstatus.fitnessperms.name'),
      desc: t(`intro.appstatus.fitnessperms.description.${DEVICE_PLATFORM}`),
      fix: () =>
        checkOrFix(
          fitnessPermissionsCheck,
          window['cordova'].plugins.BEMDataCollection.fixFitnessPermissions,
          true,
        ),
      refresh: () =>
        checkOrFix(
          fitnessPermissionsCheck,
          window['cordova'].plugins.BEMDataCollection.isValidFitnessPermissions,
          false,
        ),
    };

    return [fitnessPermissionsCheck];
  }

  function setupAndroidBluetoothChecks(): Check[] {
    if (DEVICE_VERSION >= 10) {
      const bluetoothPermissionsCheck = {
        name: 'Bluetooth scan permission',
        desc: 'Scan for BLE beacons to automatically match trips to vehicles',
        fix: () =>
          checkOrFix(
            bluetoothPermissionsCheck,
            window['cordova'].plugins.BEMDataCollection.fixBluetoothPermissions,
            true,
          ),
        refresh: () =>
          checkOrFix(
            bluetoothPermissionsCheck,
            window['cordova'].plugins.BEMDataCollection.isValidBluetoothPermissions,
            false,
          ),
      };

      return [bluetoothPermissionsCheck];
    }
    return [];
  }

  function setupNotificationChecks(hasRequestedNotifs): Check[] {
    let appAndChannelNotificationsCheck = {
      name: t('intro.appstatus.notificationperms.app-enabled-name'),
      desc: t(`intro.appstatus.notificationperms.description.${DEVICE_PLATFORM}-enable`),
      fix: () => {
        appAndChannelNotificationsCheck.wasRequested = true;
        return checkOrFix(
          appAndChannelNotificationsCheck,
          window['cordova'].plugins.BEMDataCollection.fixShowNotifications,
          false,
        );
      },
      refresh: () =>
        checkOrFix(
          appAndChannelNotificationsCheck,
          window['cordova'].plugins.BEMDataCollection.isValidShowNotifications,
          false,
        ),
      isOptional: true,
      wasRequested: hasRequestedNotifs,
    };

    return [appAndChannelNotificationsCheck];
  }

  function setupAndroidBackgroundRestrictionChecks(): Check[] {
    const androidUnusedDescTag =
      DEVICE_VERSION == 12
        ? 'intro.appstatus.unusedapprestrict.description.android-disable-12'
        : DEVICE_VERSION < 12
          ? 'intro.appstatus.unusedapprestrict.description.android-disable-lt-12'
          : 'intro.appstatus.unusedapprestrict.description.android-disable-gte-13';

    const unusedAppsUnrestrictedCheck = {
      name: t('intro.appstatus.unusedapprestrict.name'),
      desc: t(androidUnusedDescTag),
      fix: () =>
        checkOrFix(
          unusedAppsUnrestrictedCheck,
          window['cordova'].plugins.BEMDataCollection.fixUnusedAppRestrictions,
          true,
        ),
      refresh: () =>
        checkOrFix(
          unusedAppsUnrestrictedCheck,
          window['cordova'].plugins.BEMDataCollection.isUnusedAppUnrestricted,
          false,
        ),
    };

    const ignoreBatteryOptCheck = {
      name: t('intro.appstatus.ignorebatteryopt.name'),
      desc: t('intro.appstatus.ignorebatteryopt.description'),
      fix: () =>
        checkOrFix(
          ignoreBatteryOptCheck,
          window['cordova'].plugins.BEMDataCollection.fixIgnoreBatteryOptimizations,
          true,
        ),
      refresh: () =>
        checkOrFix(
          ignoreBatteryOptCheck,
          window['cordova'].plugins.BEMDataCollection.isIgnoreBatteryOptimizations,
          false,
        ),
    };

    return [unusedAppsUnrestrictedCheck, ignoreBatteryOptCheck];
  }

  function setupPermissionText() {
    let tempExplanations = explanationList;

    let overallFitnessName = t('intro.appstatus.overall-fitness-name-android');
    let locExplanation = t('intro.appstatus.overall-loc-description');
    if (DEVICE_PLATFORM == 'ios') {
      overallFitnessName = t('intro.appstatus.overall-fitness-name-ios');
    }
    tempExplanations.push({ name: t('intro.appstatus.overall-loc-name'), desc: locExplanation });
    tempExplanations.push({
      name: overallFitnessName,
      desc: t('intro.appstatus.overall-fitness-description'),
    });
    tempExplanations.push({
      name: t('intro.appstatus.overall-notification-name'),
      desc: t('intro.appstatus.overall-notification-description'),
    });
    tempExplanations.push({
      name: t('intro.appstatus.overall-background-restrictions-name'),
      desc: t('intro.appstatus.overall-background-restrictions-description'),
    });

    setExplanationList(tempExplanations);

    //TODO - update samsung handling based on feedback

    logDebug('Explanation = ' + explanationList);
  }

  function createChecklist(hasRequestedNotifs) {
    let newCheckList: Check[] = [];
    newCheckList.push(...setupLocChecks());
    newCheckList.push(...setupFitnessChecks());
    if (DEVICE_PLATFORM == 'android') {
      if (appConfig.tracking?.is_fleet) {
        newCheckList.push(...setupAndroidBluetoothChecks());
      }
      newCheckList.push(...setupAndroidBackgroundRestrictionChecks());
    }
    newCheckList.push(...setupNotificationChecks(hasRequestedNotifs));
    refreshAllChecks(newCheckList);
  }

  useEffect(() => {
    if (appState == 'active') {
      logDebug('usePermissionStatus: App state is active, refreshing checks');
      refreshAllChecks(checkList);
    }
  }, [appState]);

  //load when ready
  useEffect(() => {
    if (appConfig && window['device']?.platform) {
      readConsentState().then((isConsented) => {
        DEVICE_PLATFORM = window['device'].platform.toLowerCase();
        DEVICE_VERSION = window['device'].version.split('.')[0];
        setupPermissionText();
        logDebug('setting up permissions');
        createChecklist(isConsented);
      });
    }
  }, [appConfig]);

  return { checkList, overallStatus, refreshAllChecks, explanationList };
};

export default usePermissionStatus;
