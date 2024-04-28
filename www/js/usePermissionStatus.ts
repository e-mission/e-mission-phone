import { useEffect, useState, useMemo } from 'react';
import useAppStateChange from './useAppStateChange';
import useAppConfig from './useAppConfig';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from './appTheme';
import { logDebug, logWarn } from './plugin/logger';

//refreshing checks with the plugins to update the check's statusState
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
  statusState?: boolean;
  statusIcon?: string;
  statusColor?: string;
};

const usePermissionStatus = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const appConfig = useAppConfig();

  const [error, setError] = useState<string>('');
  const [errorVis, setErrorVis] = useState<boolean>(false);

  const [checkList, setCheckList] = useState<Check[]>([]);
  const [explanationList, setExplanationList] = useState<Array<any>>([]);
  const [haveSetText, setHaveSetText] = useState<boolean>(false);

  let iconMap = (statusState) => (statusState ? 'check-circle-outline' : 'alpha-x-circle-outline');
  let colorMap = (statusState) => (statusState ? colors.success : colors.danger);

  const overallStatus = useMemo<boolean | undefined>(() => {
    let status = true;
    if (!checkList?.length) return undefined; // if checks not loaded yet, status is undetermined
    checkList.forEach((lc) => {
      logDebug('check in permission status for ' + lc.name + ':' + lc.statusState);
      if (lc.statusState === false) {
        status = false;
      }
    });
    return status;
  }, [checkList]);

  //using this function to update checks rather than mutate
  //this cues React to update UI
  function updateCheck(newObject) {
    const tempList = [...checkList]; //make a copy rather than mutate
    //update the visiblility pieces here, rather than mutating
    newObject.statusIcon = iconMap(newObject.statusState);
    newObject.statusColor = colorMap(newObject.statusState);
    //"find and replace" the check
    tempList.forEach((item, i) => {
      if (item.name == newObject.name) {
        tempList[i] = newObject;
      }
    });
    setCheckList(tempList);
  }

  async function checkOrFix(checkObj, nativeFn, showError = true) {
    logDebug('checking object ' + checkObj.name + ' ' + JSON.stringify(checkObj));
    let newCheck = checkObj;
    return nativeFn()
      .then((status) => {
        logDebug('availability = ' + status);
        newCheck.statusState = true;
        updateCheck(newCheck);
        logDebug(`after checking obj ${checkObj.name}, checkList is ${JSON.stringify(checkList)}`);
        return status;
      })
      .catch((error) => {
        if (showError) {
          setError(error);
          setErrorVis(true);
        }
        newCheck.statusState = false;
        updateCheck(newCheck);
        logDebug(`after checking obj ${checkObj.name}, checkList is ${JSON.stringify(checkList)}`);
        return error;
      });
  }

  function setupAndroidLocChecks() {
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
      logDebug('fix and refresh location permissions');
      return checkOrFix(
        locPermissionsCheck,
        window['cordova'].plugins.BEMDataCollection.isValidLocationPermissions,
        false,
      );
    };
    const androidVersion = window['device'].version.split('.')[0];
    const androidSettingsDescTag =
      androidVersion < 9
        ? 'intro.appstatus.locsettings.description.android-lt-9'
        : 'intro.appstatus.locsettings.description.android-gte-9';
    const androidPermDescTag =
      androidVersion < 6
        ? 'intro.appstatus.locperms.description.android-lt-6'
        : androidVersion < 10
          ? 'intro.appstatus.locperms.description.android-6-9'
          : androidVersion < 11
            ? 'intro.appstatus.locperms.description.android-10'
            : androidVersion < 12
              ? 'intro.appstatus.locperms.description.android-11'
              : 'intro.appstatus.locperms.description.android-gte-12';
    logDebug('description tags are ' + androidSettingsDescTag + ' ' + androidPermDescTag);
    // location settings
    let locSettingsCheck = {
      name: t('intro.appstatus.locsettings.name'),
      desc: t(androidSettingsDescTag),
      fix: fixSettings,
      refresh: checkSettings,
    };
    let locPermissionsCheck = {
      name: t('intro.appstatus.locperms.name'),
      desc: t(androidPermDescTag),
      fix: fixPerms,
      refresh: checkPerms,
    };
    let tempChecks = checkList;
    tempChecks.push(locSettingsCheck, locPermissionsCheck);
    setCheckList(tempChecks);
  }

  function setupIOSLocChecks() {
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
      logDebug('fix and refresh location permissions');
      return checkOrFix(
        locPermissionsCheck,
        window['cordova'].plugins.BEMDataCollection.isValidLocationPermissions,
        false,
      );
    };
    const iOSVersion = window['device'].version.split('.')[0];
    const iOSSettingsDescTag = 'intro.appstatus.locsettings.description.ios';
    const iOSPermDescTag =
      iOSVersion < 13
        ? 'intro.appstatus.locperms.description.ios-lt-13'
        : 'intro.appstatus.locperms.description.ios-gte-13';
    logDebug('description tags are ' + iOSSettingsDescTag + ' ' + iOSPermDescTag);

    const locSettingsCheck = {
      name: t('intro.appstatus.locsettings.name'),
      desc: t(iOSSettingsDescTag),
      fix: fixSettings,
      refresh: checkSettings,
    };
    const locPermissionsCheck = {
      name: t('intro.appstatus.locperms.name'),
      desc: t(iOSPermDescTag),
      fix: fixPerms,
      refresh: checkPerms,
    };
    let tempChecks = checkList;
    tempChecks.push(locSettingsCheck, locPermissionsCheck);
    setCheckList(tempChecks);
  }

  function setupAndroidFitnessChecks() {
    if (window['device'].version.split('.')[0] >= 10) {
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
        logDebug('fix and refresh fitness permissions');
        return checkOrFix(
          fitnessPermissionsCheck,
          window['cordova'].plugins.BEMDataCollection.isValidFitnessPermissions,
          false,
        );
      };

      let fitnessPermissionsCheck = {
        name: t('intro.appstatus.fitnessperms.name'),
        desc: t('intro.appstatus.fitnessperms.description.android'),
        fix: fixPerms,
        refresh: checkPerms,
      };
      let tempChecks = checkList;
      tempChecks.push(fitnessPermissionsCheck);
      setCheckList(tempChecks);
    }
  }

  function setupIOSFitnessChecks() {
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
      logDebug('fix and refresh fitness permissions');
      return checkOrFix(
        fitnessPermissionsCheck,
        window['cordova'].plugins.BEMDataCollection.isValidFitnessPermissions,
        false,
      );
    };

    let fitnessPermissionsCheck = {
      name: t('intro.appstatus.fitnessperms.name'),
      desc: t('intro.appstatus.fitnessperms.description.ios'),
      fix: fixPerms,
      refresh: checkPerms,
    };
    let tempChecks = checkList;
    tempChecks.push(fitnessPermissionsCheck);
    setCheckList(tempChecks);
  }

  function setupAndroidBluetoothChecks() {
    if (window['device'].version.split('.')[0] >= 10) {
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
        logDebug('fix and refresh bluetooth permissions');
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

  function setupAndroidNotificationChecks() {
    let fixPerms = () => {
      logDebug('fix and refresh notification permissions');
      return checkOrFix(
        appAndChannelNotificationsCheck,
        window['cordova'].plugins.BEMDataCollection.fixShowNotifications,
        true,
      );
    };
    let checkPerms = () => {
      logDebug('fix and refresh notification permissions');
      return checkOrFix(
        appAndChannelNotificationsCheck,
        window['cordova'].plugins.BEMDataCollection.isValidShowNotifications,
        false,
      );
    };
    let appAndChannelNotificationsCheck = {
      name: t('intro.appstatus.notificationperms.app-enabled-name'),
      desc: t('intro.appstatus.notificationperms.description.android-enable'),
      fix: fixPerms,
      refresh: checkPerms,
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
      logDebug('fix and refresh backgroundRestriction permissions');
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
      logDebug('fix and refresh battery optimization permissions');
      return checkOrFix(
        ignoreBatteryOptCheck,
        window['cordova'].plugins.BEMDataCollection.isIgnoreBatteryOptimizations,
        false,
      );
    };
    const androidVersion = window['device'].version.split('.')[0];
    const androidUnusedDescTag =
      androidVersion == 12
        ? 'intro.appstatus.unusedapprestrict.description.android-disable-12'
        : androidVersion < 12
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
    if (window['device'].platform.toLowerCase() == 'ios') {
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

  function createChecklist() {
    if (window['device'].platform.toLowerCase() == 'android') {
      setupAndroidLocChecks();
      setupAndroidFitnessChecks();
      if (appConfig.tracking?.bluetooth_only) {
        setupAndroidBluetoothChecks();
      }
      setupAndroidNotificationChecks();
      setupAndroidBackgroundRestrictionChecks();
    } else if (window['device'].platform.toLowerCase() == 'ios') {
      setupIOSLocChecks();
      setupIOSFitnessChecks();
      setupAndroidNotificationChecks();
    } else {
      setError('Alert! unknownplatform, no tracking');
      setErrorVis(true);
      logWarn('Alert! unknownplatform, no tracking'); //need an alert, can use AlertBar?
    }

    refreshAllChecks(checkList);
  }

  useAppStateChange(() => {
    logDebug('PERMISSION CHECK: app has resumed, should refresh');
    refreshAllChecks(checkList);
  });

  //load when ready
  useEffect(() => {
    if (appConfig && window['device']?.platform) {
      setupPermissionText();
      setHaveSetText(true);
      logDebug('setting up permissions');
      createChecklist();
    }
  }, [appConfig]);

  return { checkList, overallStatus, error, errorVis, setErrorVis, explanationList };
};

export default usePermissionStatus;
