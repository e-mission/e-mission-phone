import { useEffect, useState, useMemo } from 'react';
import useAppStateChange from "./useAppStateChange";
import useAppConfig from "./useAppConfig";
import { useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";

//refreshing checks with the plugins to update the check's statusState
export function refreshAllChecks(checkList) {
    //refresh each check
    checkList.forEach((lc) => {
        lc.refresh();
    });
    console.log("setting checks are", checkList);
}

const usePermissionStatus = () => {

    const { t } = useTranslation();
    const { colors } = useTheme();
    const appConfig = useAppConfig();

    const [error, setError] = useState<string>("");
    const [errorVis, setErrorVis] = useState<boolean>(false);

    const [checkList, setCheckList] = useState([]);
    const [explanationList, setExplanationList] = useState<Array<any>>([]);
    const [haveSetText, setHaveSetText] = useState<boolean>(false);

    let iconMap = (statusState) => statusState ? "check-circle-outline" : "alpha-x-circle-outline";
    let colorMap = (statusState) => statusState ? colors.success : colors.danger;

    const overallStatus = useMemo<boolean|undefined>(() => {
        let status = true;
        if (!checkList?.length) return undefined; // if checks not loaded yet, status is undetermined
        checkList.forEach((lc) => {
            console.debug('check in permission status for ' + lc.name + ':', lc.statusState);
            if (lc.statusState === false) {
                status = false;
            }
        })
        return status;
    }, [checkList])

    //using this function to update checks rather than mutate
    //this cues React to update UI
    function updateCheck(newObject) {
        var tempList = [...checkList]; //make a copy rather than mutate
        //update the visiblility pieces here, rather than mutating
        newObject.statusIcon = iconMap(newObject.statusState);
        newObject.statusColor = colorMap(newObject.statusState);
        //"find and replace" the check
        tempList.forEach((item, i) => {
            if(item.name == newObject.name){
                tempList[i] = newObject;
            }
        });
        setCheckList(tempList);
    }

    async function checkOrFix(checkObj, nativeFn, showError=true) {
        console.log("checking object", checkObj.name, checkObj);
        let newCheck = checkObj;
        return nativeFn()
            .then((status) => {
                console.log("availability ", status)
                newCheck.statusState = true;
                updateCheck(newCheck);
                console.log("after checking object", checkObj.name, checkList);
                return status;
            }).catch((error) => {
                console.log("Error", error)
                if (showError) {
                    console.log("please fix again");
                    setError(error);
                    setErrorVis(true);
                };
                newCheck.statusState = false;
                updateCheck(newCheck);
                console.log("after checking object", checkObj.name, checkList);
                return error;
            });
    }

    function setupAndroidLocChecks() {
        let fixSettings = function() {
            console.log("Fix and refresh location settings");
            return checkOrFix(locSettingsCheck, window['cordova'].plugins.BEMDataCollection.fixLocationSettings, true);
        };
        let checkSettings = function() {
            console.log("Refresh location settings");
            return checkOrFix(locSettingsCheck, window['cordova'].plugins.BEMDataCollection.isValidLocationSettings, false);
        };
        let fixPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, window['cordova'].plugins.BEMDataCollection.fixLocationPermissions,
                true).then((error) => {if(error){locPermissionsCheck.desc = error}});
        };
        let checkPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, window['cordova'].plugins.BEMDataCollection.isValidLocationPermissions, false);
        };
        var androidSettingsDescTag = "intro.appstatus.locsettings.description.android-gte-9";
        if (window['device'].version.split(".")[0] < 9) {
            androidSettingsDescTag = "intro.appstatus.locsettings.description.android-lt-9";
        }
        var androidPermDescTag = "intro.appstatus.locperms.description.android-gte-12";
        if(window['device'].version.split(".")[0] < 6) {
            androidPermDescTag = 'intro.appstatus.locperms.description.android-lt-6';
        } else if (window['device'].version.split(".")[0] < 10) {
            androidPermDescTag = "intro.appstatus.locperms.description.android-6-9";
        } else if (window['device'].version.split(".")[0] < 11) {
            androidPermDescTag= "intro.appstatus.locperms.description.android-10";
        } else if (window['device'].version.split(".")[0] < 12) {
            androidPermDescTag= "intro.appstatus.locperms.description.android-11";
        }
        console.log("description tags are "+androidSettingsDescTag+" "+androidPermDescTag);
        // location settings
        let locSettingsCheck = {
            name: t("intro.appstatus.locsettings.name"),
            desc: t(androidSettingsDescTag),
            fix: fixSettings,
            refresh: checkSettings
        }
        let locPermissionsCheck = {
            name: t("intro.appstatus.locperms.name"),
            desc: t(androidPermDescTag),
            fix: fixPerms,
            refresh: checkPerms
        }
        let tempChecks = checkList;
        tempChecks.push(locSettingsCheck, locPermissionsCheck);
        setCheckList(tempChecks);
    }

    function setupIOSLocChecks() {
        let fixSettings = function() {
            console.log("Fix and refresh location settings");
            return checkOrFix(locSettingsCheck, window['cordova'].plugins.BEMDataCollection.fixLocationSettings,
                true);
        };
        let checkSettings = function() {
            console.log("Refresh location settings");
            return checkOrFix(locSettingsCheck, window['cordova'].plugins.BEMDataCollection.isValidLocationSettings,
                false);
        };
        let fixPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, window['cordova'].plugins.BEMDataCollection.fixLocationPermissions,
                true).then((error) => {if(error){locPermissionsCheck.desc = error}});
        };
        let checkPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, window['cordova'].plugins.BEMDataCollection.isValidLocationPermissions,
                false);
        };
        var iOSSettingsDescTag = "intro.appstatus.locsettings.description.ios";
        var iOSPermDescTag = "intro.appstatus.locperms.description.ios-gte-13";
        if(window['device'].version.split(".")[0] < 13) {
            iOSPermDescTag = 'intro.appstatus.locperms.description.ios-lt-13';
        }
        console.log("description tags are "+iOSSettingsDescTag+" "+iOSPermDescTag);

        const locSettingsCheck = {
            name: t("intro.appstatus.locsettings.name"),
            desc: t(iOSSettingsDescTag),
            fix: fixSettings,
            refresh: checkSettings
        };
        const locPermissionsCheck = {
            name: t("intro.appstatus.locperms.name"),
            desc: t(iOSPermDescTag),
            fix: fixPerms,
            refresh: checkPerms
        };
        let tempChecks = checkList;
        tempChecks.push(locSettingsCheck, locPermissionsCheck);
        setCheckList(tempChecks);
    }

    function setupAndroidFitnessChecks() {
        if(window['device'].version.split(".")[0] >= 10){
            let fixPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, window['cordova'].plugins.BEMDataCollection.fixFitnessPermissions,
                true).then((error) => {if(error){fitnessPermissionsCheck.desc = error}});
            };
            let checkPerms = function() {
                console.log("fix and refresh fitness permissions");
                return checkOrFix(fitnessPermissionsCheck, window['cordova'].plugins.BEMDataCollection.isValidFitnessPermissions,
                    false);
            };
    
            let fitnessPermissionsCheck = {
                name: t("intro.appstatus.fitnessperms.name"),
                desc: t("intro.appstatus.fitnessperms.description.android"),
                fix: fixPerms,
                refresh: checkPerms
            }
            let tempChecks = checkList;
            tempChecks.push(fitnessPermissionsCheck);
            setCheckList(tempChecks);
        }
    }

    function setupIOSFitnessChecks() {
        let fixPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, window['cordova'].plugins.BEMDataCollection.fixFitnessPermissions,
                true).then((error) => {if(error){fitnessPermissionsCheck.desc = error}});
        };
        let checkPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, window['cordova'].plugins.BEMDataCollection.isValidFitnessPermissions,
                false);
        };
  
        let fitnessPermissionsCheck = {
            name: t("intro.appstatus.fitnessperms.name"),
            desc: t("intro.appstatus.fitnessperms.description.ios"),
            fix: fixPerms,
            refresh: checkPerms
        }
        let tempChecks = checkList;
        tempChecks.push(fitnessPermissionsCheck);
        setCheckList(tempChecks);
    }

    function setupAndroidNotificationChecks() {
        let fixPerms = function() {
            console.log("fix and refresh notification permissions");
            return checkOrFix(appAndChannelNotificationsCheck, window['cordova'].plugins.BEMDataCollection.fixShowNotifications,
                true);
        };
        let checkPerms = function() {
            console.log("fix and refresh notification permissions");
            return checkOrFix(appAndChannelNotificationsCheck, window['cordova'].plugins.BEMDataCollection.isValidShowNotifications,
                false);
        };
        let appAndChannelNotificationsCheck = {
            name: t("intro.appstatus.notificationperms.app-enabled-name"),
            desc: t("intro.appstatus.notificationperms.description.android-enable"),
            fix: fixPerms,
            refresh: checkPerms
        }
        let tempChecks = checkList;
        tempChecks.push(appAndChannelNotificationsCheck);
        setCheckList(tempChecks);
    }

    function setupAndroidBackgroundRestrictionChecks() {
        let fixPerms = function() {
            console.log("fix and refresh backgroundRestriction permissions");
            return checkOrFix(unusedAppsUnrestrictedCheck, window['cordova'].plugins.BEMDataCollection.fixUnusedAppRestrictions,
                true);
        };
        let checkPerms = function() {
            console.log("fix and refresh backgroundRestriction permissions");
            return checkOrFix(unusedAppsUnrestrictedCheck, window['cordova'].plugins.BEMDataCollection.isUnusedAppUnrestricted,
                false);
        };
        let fixBatteryOpt = function() {
            console.log("fix and refresh battery optimization permissions");
            return checkOrFix(ignoreBatteryOptCheck, window['cordova'].plugins.BEMDataCollection.fixIgnoreBatteryOptimizations,
                true);
        };
        let checkBatteryOpt = function() {
            console.log("fix and refresh battery optimization permissions");
            return checkOrFix(ignoreBatteryOptCheck, window['cordova'].plugins.BEMDataCollection.isIgnoreBatteryOptimizations,
                false);
        };
        var androidUnusedDescTag = "intro.appstatus.unusedapprestrict.description.android-disable-gte-13";
        if (window['device'].version.split(".")[0] == 12) {
            androidUnusedDescTag= "intro.appstatus.unusedapprestrict.description.android-disable-12";
        }
        else if (window['device'].version.split(".")[0] < 12) {
            androidUnusedDescTag= "intro.appstatus.unusedapprestrict.description.android-disable-lt-12";
        }
        let unusedAppsUnrestrictedCheck = {
            name: t("intro.appstatus.unusedapprestrict.name"),
            desc: t(androidUnusedDescTag),
            fix: fixPerms,
            refresh: checkPerms
        }
        let ignoreBatteryOptCheck = {
            name: t("intro.appstatus.ignorebatteryopt.name"),
            desc: t("intro.appstatus.ignorebatteryopt.description.android-disable"),
            fix: fixBatteryOpt,
            refresh: checkBatteryOpt
        }
        let tempChecks = checkList;
        tempChecks.push(unusedAppsUnrestrictedCheck, ignoreBatteryOptCheck);
        setCheckList(tempChecks);
    }

    function setupPermissionText() {
        let tempExplanations = explanationList;

        let overallFitnessName = t('intro.appstatus.overall-fitness-name-android');
        let locExplanation = t('intro.appstatus.overall-loc-description');
        if(window['device'].platform.toLowerCase() == "ios") {
            overallFitnessName = t('intro.appstatus.overall-fitness-name-ios');
            if(window['device'].version.split(".")[0] < 13) {
                locExplanation = (t("intro.permissions.locationPermExplanation-ios-lt-13"));
            } else {
                locExplanation = (t("intro.permissions.locationPermExplanation-ios-gte-13"));
            }
        }
        tempExplanations.push({name: t('intro.appstatus.overall-loc-name'), desc: locExplanation});
        tempExplanations.push({name: overallFitnessName, desc: t('intro.appstatus.overall-fitness-description')});
        tempExplanations.push({name: t('intro.appstatus.overall-notification-name'), desc: t('intro.appstatus.overall-notification-description')});
        tempExplanations.push({name: t('intro.appstatus.overall-background-restrictions-name'), desc: t('intro.appstatus.overall-background-restrictions-description')});

        setExplanationList(tempExplanations);
  
        //TODO - update samsung handling based on feedback

        console.log("Explanation = "+explanationList);
    }

    function createChecklist(){
        if(window['device'].platform.toLowerCase() == "android") {
            setupAndroidLocChecks();
            setupAndroidFitnessChecks();
            setupAndroidNotificationChecks();
            setupAndroidBackgroundRestrictionChecks();
        } else if (window['device'].platform.toLowerCase() == "ios") {
            setupIOSLocChecks();
            setupIOSFitnessChecks();
            setupAndroidNotificationChecks();
        } else {
            setError("Alert! unknownplatform, no tracking");
            setErrorVis(true);
            console.log("Alert! unknownplatform, no tracking"); //need an alert, can use AlertBar?
        }
        
        refreshAllChecks(checkList);
    }

    useAppStateChange( function() {
        console.log("PERMISSION CHECK: app has resumed, should refresh");
        refreshAllChecks(checkList);
    });

     //load when ready
     useEffect(() => {
        if (appConfig && window['device']?.platform) {
            setupPermissionText();
            setHaveSetText(true);
            console.log("setting up permissions");
            createChecklist();
        }
    }, [appConfig]);
  
    return {checkList, overallStatus, error, errorVis, setErrorVis, explanationList};
  }
  
  export default usePermissionStatus;
