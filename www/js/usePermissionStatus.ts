import { useEffect, useState, useMemo } from 'react';
import useAppState from './useAppState';
import useAppConfig from './useAppConfig';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from './appTheme';
import { logDebug, logWarn } from './plugin/logger';
import { AlertManager } from './components/AlertBar';
import { readConsented } from './onboarding/onboardingHelper';

let DEVICE_PLATFORM: 'android' | 'ios';
let DEVICE_VERSION: number;

//refreshing checks with the plugins to update the check's status
export function refreshAllChecks(checkList) {
  //refresh each check
  checkList.forEach((lc) => {
    lc.refresh();
  });
  logDebug('After refreshing all checks, checks are ' + JSON.stringify(checkList));
}

type Check = {
  name: string;
  desc: string;
  fix: () => Promise<any>;
  refresh: () => Promise<any>;
  status?: boolean;
  isOptional?: boolean;
  wasRequested?: boolean;
};

const usePermissionStatus = () => {
  const { t } = useTranslation();
  const appConfig = useAppConfig();

  const [checkList, setCheckList] = useState<Check[]>([]);
  const [explanationList, setExplanationList] = useState<Array<any>>([]);

  const overallStatus = useMemo<boolean | undefined>(() => {
    if (!checkList?.length) return undefined; // if checks not loaded yet, status is undetermined
    return checkList.every((check) => check.status || (check.isOptional && check.wasRequested));
  }, [checkList]);

  //using this function to update checks rather than mutate
  //this cues React to update UI
  function updateCheck(newCheck) {
    const tempList = [...checkList];
    //"find and replace" the check
    const i = tempList.findIndex((item) => item.name == newCheck.name);
    tempList[i] = newCheck;
    setCheckList(tempList);
  }

  async function checkOrFix(checkObj, nativeFn, showError = true) {
    logDebug('checking object ' + checkObj.name + ' ' + JSON.stringify(checkObj));
    let newCheck = checkObj;
    try {
      const status = await nativeFn();
      logDebug(`${checkObj.name} status = ${status}`);
      newCheck.status = true;
      updateCheck(newCheck);
      return status;
    } catch (error) {
      if (showError) {
        AlertManager.addMessage({ text: error });
      }
      newCheck.status = false;
      updateCheck(newCheck);
      return error;
    }
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

  function setupLocChecks() {
    let fixSettings = () => {
      logDebug('Fix and refresh location settings');
      return checkOrFix(
        locSettingsCheck,
        window['cordova'].plugins.BEMDataCollection.fixLocationSettings,
        true,
      );
    };
    let checkSettings = () => {
      logDebug('Refresh location settings');
      return checkOrFix(
        locSettingsCheck,
        window['cordova'].plugins.BEMDataCollection.isValidLocationSettings,
        false,
      );
    };
    let fixPerms = () => {
      logDebug('fix and refresh location permissions');
      return checkOrFix(
        locPermissionsCheck,
        window['cordova'].plugins.BEMDataCollection.fixLocationPermissions,
        true,
      ).then((error) => {
        if (error) {
          locPermissionsCheck.desc = error;
        }
      });
    };
    let checkPerms = () => {
      logDebug('refresh location permissions');
      return checkOrFix(
        locPermissionsCheck,
        window['cordova'].plugins.BEMDataCollection.isValidLocationPermissions,
        false,
      );
    };

    // location settings
    let locSettingsCheck = {
      name: t('intro.appstatus.locsettings.name'),
      desc: t(getLocSettingsDescriptionTag()),
      fix: fixSettings,
      refresh: checkSettings,
    };
    let locPermissionsCheck = {
      name: t('intro.appstatus.locperms.name'),
      desc: t(getLocPermissionsDescriptionTag()),
      fix: fixPerms,
      refresh: checkPerms,
    };
    let tempChecks = checkList;
    tempChecks.push(locSettingsCheck, locPermissionsCheck);
    setCheckList(tempChecks);
  }

  function setupFitnessChecks() {
    if (DEVICE_PLATFORM == 'android' && DEVICE_VERSION < 10) {
      logDebug('Android version < 10, skipping fitness checks');
      return;
    }

    let fixPerms = () => {
      logDebug('fix and refresh fitness permissions');
      return checkOrFix(
        fitnessPermissionsCheck,
        window['cordova'].plugins.BEMDataCollection.fixFitnessPermissions,
        true,
      ).then((error) => {
        if (error) {
          fitnessPermissionsCheck.desc = error;
        }
      });
    };
    let checkPerms = () => {
      logDebug('refresh fitness permissions');
      return checkOrFix(
        fitnessPermissionsCheck,
        window['cordova'].plugins.BEMDataCollection.isValidFitnessPermissions,
        false,
      );
    };

    let fitnessPermissionsCheck = {
      name: t('intro.appstatus.fitnessperms.name'),
      desc: t(`intro.appstatus.fitnessperms.description.${DEVICE_PLATFORM}`),
      fix: fixPerms,
      refresh: checkPerms,
    };
    let tempChecks = checkList;
    tempChecks.push(fitnessPermissionsCheck);
    setCheckList(tempChecks);
  }

  function setupAndroidBluetoothChecks() {
    if (DEVICE_VERSION >= 10) {
      let fixPerms = () => {
        logDebug('fix and refresh bluetooth permissions');
        return checkOrFix(
          bluetoothPermissionsCheck,
          window['cordova'].plugins.BEMDataCollection.fixBluetoothPermissions,
          true,
        ).then((error) => {
          if (error) {
            bluetoothPermissionsCheck.desc = error;
          }
        });
      };
      let checkPerms = () => {
        logDebug('refresh bluetooth permissions');
        return checkOrFix(
          bluetoothPermissionsCheck,
          window['cordova'].plugins.BEMDataCollection.isValidBluetoothPermissions,
          false,
        );
      };

      let bluetoothPermissionsCheck = {
        name: 'Bluetooth scan permission',
        desc: 'Scan for BLE beacons to automatically match trips to vehicles',
        fix: fixPerms,
        refresh: checkPerms,
      };
      let tempChecks = checkList;
      tempChecks.push(bluetoothPermissionsCheck);
      setCheckList(tempChecks);
    }
  }

  function setupNotificationChecks(hasRequestedNotifs) {
    let fixPerms = () => {
      logDebug('fix and refresh notification permissions');
      appAndChannelNotificationsCheck.wasRequested = true;
      return checkOrFix(
        appAndChannelNotificationsCheck,
        window['cordova'].plugins.BEMDataCollection.fixShowNotifications,
        false,
      ).then((error) => {
        if (error) {
          appAndChannelNotificationsCheck.desc = error;
        }
      });
    };
    let checkPerms = () => {
      logDebug('refresh notification permissions');
      return checkOrFix(
        appAndChannelNotificationsCheck,
        window['cordova'].plugins.BEMDataCollection.isValidShowNotifications,
        false,
      );
    };
    let appAndChannelNotificationsCheck = {
      name: t('intro.appstatus.notificationperms.app-enabled-name'),
      desc: t(`intro.appstatus.notificationperms.description.${DEVICE_PLATFORM}-enable`),
      fix: fixPerms,
      refresh: checkPerms,
      isOptional: true,
      wasRequested: hasRequestedNotifs,
    };
    let tempChecks = checkList;
    tempChecks.push(appAndChannelNotificationsCheck);
    setCheckList(tempChecks);
  }

  function setupAndroidBackgroundRestrictionChecks() {
    let fixPerms = () => {
      logDebug('fix and refresh backgroundRestriction permissions');
      return checkOrFix(
        unusedAppsUnrestrictedCheck,
        window['cordova'].plugins.BEMDataCollection.fixUnusedAppRestrictions,
        true,
      );
    };
    let checkPerms = () => {
      logDebug('refresh backgroundRestriction permissions');
      return checkOrFix(
        unusedAppsUnrestrictedCheck,
        window['cordova'].plugins.BEMDataCollection.isUnusedAppUnrestricted,
        false,
      );
    };
    let fixBatteryOpt = () => {
      logDebug('fix and refresh battery optimization permissions');
      return checkOrFix(
        ignoreBatteryOptCheck,
        window['cordova'].plugins.BEMDataCollection.fixIgnoreBatteryOptimizations,
        true,
      );
    };
    let checkBatteryOpt = () => {
      logDebug('refresh battery optimization permissions');
      return checkOrFix(
        ignoreBatteryOptCheck,
        window['cordova'].plugins.BEMDataCollection.isIgnoreBatteryOptimizations,
        false,
      );
    };
    const androidUnusedDescTag =
      DEVICE_VERSION == 12
        ? 'intro.appstatus.unusedapprestrict.description.android-disable-12'
        : DEVICE_VERSION < 12
          ? 'intro.appstatus.unusedapprestrict.description.android-disable-lt-12'
          : 'intro.appstatus.unusedapprestrict.description.android-disable-gte-13';
    let unusedAppsUnrestrictedCheck = {
      name: t('intro.appstatus.unusedapprestrict.name'),
      desc: t(androidUnusedDescTag),
      fix: fixPerms,
      refresh: checkPerms,
    };
    let ignoreBatteryOptCheck = {
      name: t('intro.appstatus.ignorebatteryopt.name'),
      desc: t('intro.appstatus.ignorebatteryopt.description'),
      fix: fixBatteryOpt,
      refresh: checkBatteryOpt,
    };
    let tempChecks = checkList;
    tempChecks.push(unusedAppsUnrestrictedCheck, ignoreBatteryOptCheck);
    setCheckList(tempChecks);
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
    setupLocChecks();
    setupFitnessChecks();
    if (DEVICE_PLATFORM == 'android') {
      if (appConfig.tracking?.bluetooth_only) {
        setupAndroidBluetoothChecks();
      }
      setupAndroidBackgroundRestrictionChecks();
    }
    setupNotificationChecks(hasRequestedNotifs);
    refreshAllChecks(checkList);
  }

  useAppState({
    onResume: () => {
      logDebug('PERMISSION CHECK: app has resumed, should refresh');
      refreshAllChecks(checkList);
    },
  });

  //load when ready
  useEffect(() => {
    if (appConfig && window['device']?.platform) {
      readConsented().then((isConsented) => {
        DEVICE_PLATFORM = window['device'].platform.toLowerCase();
        DEVICE_VERSION = window['device'].version.split('.')[0];
        setupPermissionText();
        logDebug('setting up permissions');
        createChecklist(isConsented);
      });
    }
  }, [appConfig]);

  return { checkList, overallStatus, explanationList };
};

export default usePermissionStatus;
