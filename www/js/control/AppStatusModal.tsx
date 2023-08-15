//this comes up for checkAppStatus, and when needed?
//currently lacking the parts that actually show permissions
//will probably change when we update introduction
import React, { useState, useEffect } from "react";
import { Modal } from "react-native";
import { Dialog, Button, Text, List } from 'react-native-paper';
import { angularize } from "../angular-react-helper";
import { useTranslation } from "react-i18next";
import { getAngularService } from "../angular-react-helper";
import PermissionItem from "../appstatus/PermissionItem";
import useAppConfig from "../useAppConfig";

const AppStatusModal = ({permitVis, setPermitVis, status, dialogStyle}) => {
    const { t } = useTranslation();
    const { appConfig, loading } = useAppConfig();

    const $ionicPlatform = getAngularService("$ionicPlatform");

    const [locExpanded, setLocExpanded] = React.useState(false);
    const locPress = () => setLocExpanded(!locExpanded);
    const [fitExpanded, setFitExpanded] = React.useState(false);
    const fitPress = () => setFitExpanded(!fitExpanded);
    const [notifExpanded, setNotifExpanded] = React.useState(false);
    const notifPress = () => setNotifExpanded(!notifExpanded);
    const [backgroundExpanded, setBackgroundExpanded] = React.useState(false);
    const backgroundPress = () => setBackgroundExpanded(!backgroundExpanded);

    const [osver, setOsver] = useState(0);
    const [platform, setPlatform] = useState("");

    const [backgroundUnrestrictionsNeeded, setBackgroundUnrestrictionsNeeded] = useState(false);
    const [backgroundRestricted, setBackgroundRestricted] = useState(false);
    const [allowBackgroundInstructions, setAllowBackgroundInstructions] = useState([]);

    const [overallStatus, setOverallStatus] = useState(false);
    const [overallLocStatus, setOverallLocStatus] = useState(false);
    const [overallFitnessStatus, setOverallFitnessStatus] = useState(false);
    const [overallNotificationStatus, setOverallNotificationStatus] = useState(false);
    const [overallBackgroundRestrictionStatus, setOverallBackgroundRestrictionStatus] = useState(false);

    const [fitnessPermNeeded, setFitnessPermNeeded] = useState(false);
    const [overallFitnessName, setOverallFitnessName] = useState("");
    const [locationPermExplanation, setLocationPermExplanation] = useState("");

    const [backgroundRestrictionChecks, setBackgroundRestrictionChecks] = useState([]);
    const [locChecks, setLocChecks] = useState([]);
    const [fitnessChecks, setFitnessChecks] = useState([]);
    const [notificationChecks, setNotificationChecks] = useState([]);

    const [overallLocStatusIcon, setOverallLocStatusIcon] = useState("alpha-x-circle-outline");
    const [overallLocStatusClass, setOverallLocStatusClass] = useState("status-red");
    const [overallFitnessStatusIcon, setOverallFitnessStatusIcon] = useState("alpha-x-circle-outline");
    const [overallFitnessStatusClass, setOverallFitnessStatusClass] = useState("status-red");
    const [overallNotifStatusIcon, setOverallNotifStatusIcon] = useState("alpha-x-circle-outline");
    const [overallNotifStatusClass, setOverallNotifStatusClass] = useState("status-red");
    const [overallBackgroundRestrictionStatusIcon, setOverallBackgroundRestrictionStatusIcon] = useState("alpha-x-circle-outline");
    const [overallBackgroundRestrictionStatusClass, setOverallBackgroundRestrictionStatusClass] = useState("status-red");

    const mainControlEl = document.getElementById('main-control').querySelector('ion-view');
    const settingsScope = angular.element(mainControlEl).scope();
    console.log("settings scope", settingsScope);

    //load when ready
    useEffect(() => {
        if (appConfig) {
            console.log("setting up permissions");
            setUpPermissions();
        }
    }, [appConfig]);

    function setupLocChecks() {
        if(platform.toLowerCase() == "android") {
            return setupAndroidLocChecks();
        } else if (platform.toLowerCase == "ios") {
            return setupIOSLocChecks();
        } else {
            console.log("Alert! unknownplatform, no tracking"); //need an alert, can use AlertBar?
        }
    }

    function setupFitnessChecks() {
        if (platform.toLowerCase() == "android") {
            return setupAndroidFitnessChecks();
        } else if (platform.toLowerCase() == "ios") {
            return setupIOSFitnessChecks();
        } else {
            console.log("Alert! unknownplatform, no tracking"); //need an alert, can use AlertBar?
        }
    }

    function setupNotificationChecks() {
       return setupAndroidNotificationChecks();
    }

    function setupBackgroundRestrictionChecks() {
        if (platform.toLowerCase() == "android") {
            setBackgroundUnrestrictionsNeeded(true);
            return setupAndroidBackgroundRestrictionChecks();
        } else if (platform.toLowerCase() == "ios") {
            setBackgroundUnrestrictionsNeeded(false);
            setOverallBackgroundRestrictionStatus(true);
            setBackgroundRestrictionChecks([]);
            return true;
        } else {
            console.log("Alert! unknownplatform, no tracking"); //need an alert, can use AlertBar?
        }
    }

    function iconMap(statusState) {
        if(statusState){
            console.log("setting check because", statusState);
            return "check-circle-outline";
        } else
        {
            console.log("setting x because", statusState);
            return "alpha-x-circle-outline";
        }
    }
    // let iconMap = (statusState) => statusState ? "check-circle-outline" : "alpha-x-circle-outline";
    let classMap = (statusState) => statusState ? "status-green" : "status-red";

    function recomputeOverallStatus() {
        setOverallStatus(overallLocStatus
            && overallFitnessStatus
            && overallNotificationStatus
            && overallBackgroundRestrictionStatus);
    }

    function recomputeLocStatus() {
        locChecks.forEach((lc) => {
            lc.statusIcon = iconMap(lc.statusState);
            lc.statusClass = classMap(lc.statusState)
        });
        setOverallLocStatus(locChecks.map((lc) => lc.statusState).reduce((pv, cv) => pv && cv));
        console.log("overallLocStatus = "+overallLocStatus+" from ", locChecks);
        setOverallLocStatusIcon(iconMap(overallLocStatus));
        setOverallLocStatusClass(classMap(overallLocStatus));
        recomputeOverallStatus();
    }

    function recomputeFitnessStatus() {
        fitnessChecks.forEach((fc) => {
            fc.statusIcon = iconMap(fc.statusState);
            fc.statusClass = classMap(fc.statusState)
        });
        setOverallFitnessStatus(fitnessChecks.map((fc) => fc.statusState).reduce((pv, cv) => pv && cv));
        console.log("overallFitnessStatus = "+overallFitnessStatus+" from ", fitnessChecks);
        setOverallFitnessStatusIcon(iconMap(overallFitnessStatus));
        setOverallFitnessStatusClass(classMap(overallFitnessStatus));
        recomputeOverallStatus();
    }

    function recomputeNotificationStatus() {
        notificationChecks.forEach((nc) => {
            nc.statusIcon = iconMap(nc.statusState);
            nc.statusClass = classMap(nc.statusState)
        });
        setOverallNotificationStatus(notificationChecks.map((nc) => nc.statusState).reduce((pv, cv) => pv && cv));
        console.log("overallNotificationStatus = "+overallNotificationStatus+" from ", notificationChecks);
        setOverallNotifStatusIcon(iconMap(overallNotificationStatus));
        setOverallNotifStatusClass(classMap(overallNotificationStatus));
        recomputeOverallStatus();
    }

    function recomputeBackgroundRestrictionStatus() {
        if (!backgroundRestrictionChecks) return;
        backgroundRestrictionChecks.forEach((brc) => {
            brc.statusIcon = iconMap(brc.statusState);
            brc.statusClass = classMap(brc.statusState)
        });
        setOverallBackgroundRestrictionStatus(backgroundRestrictionChecks.map((nc) => nc.statusState).reduce((pv, cv) => pv && cv));
        console.log("overallBackgroundRestrictionStatus = "+overallBackgroundRestrictionStatus+" from ", backgroundRestrictionChecks);
        setOverallBackgroundRestrictionStatusIcon(iconMap(overallBackgroundRestrictionStatus));
        setOverallBackgroundRestrictionStatusClass(classMap(overallBackgroundRestrictionStatus));
        recomputeOverallStatus();
    }

    function checkOrFix(checkObj, nativeFn, recomputeFn, showError=true) {
        return nativeFn()
            .then((status) => {
                console.log("availability ", status)
                checkObj.statusState = true;
                recomputeFn();
                return status;
            }).catch((error) => {
                console.log("Error", error)
                if (showError) {
                    console.log("please fix again");
                    // $ionicPopup.alert({
                    //     title: "Error",
                    //     template: "<div class='item-text-wrap'>"+error+"</div>",
                    //     okText: "Please fix again"
                    // });
                };
                checkObj.statusState = false;
                recomputeFn();
                return error;
            });
    }

    function refreshChecks(checksList, recomputeFn) {
        // without this, even if the checksList is []
        // the reduce in the recomputeFn fails because it is called on a zero
        // length array without a default value
        // we should be able to also specify a default value of True
        // but I don't want to mess with that at this last minute
        if (!checksList || checksList.length == 0) {
            return Promise.resolve(true);
        }
        let checkPromises = checksList?.map((lc) => lc.refresh());
        console.log(checkPromises);
        return Promise.all(checkPromises)
            .then((result) => recomputeFn())
            .catch((error) => recomputeFn())
    }

    function setupAndroidLocChecks() {
        let fixSettings = function() {
            console.log("Fix and refresh location settings");
            return checkOrFix(locSettingsCheck, window.cordova.plugins.BEMDataCollection.fixLocationSettings,
                recomputeLocStatus, true);
        };
        let checkSettings = function() {
            console.log("Refresh location settings");
            return checkOrFix(locSettingsCheck, window.cordova.plugins.BEMDataCollection.isValidLocationSettings,
                recomputeLocStatus, false);
        };
        let fixPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, window.cordova.plugins.BEMDataCollection.fixLocationPermissions,
                recomputeLocStatus, true).then((error) => locPermissionsCheck.desc = error);
        };
        let checkPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, window.cordova.plugins.BEMDataCollection.isValidLocationPermissions,
                recomputeLocStatus, false);
        };
        var androidSettingsDescTag = "intro.appstatus.locsettings.description.android-gte-9";
        if (osver < 9) {
            androidSettingsDescTag = "intro.appstatus.locsettings.description.android-lt-9";
        }
        var androidPermDescTag = "intro.appstatus.locperms.description.android-gte-12";
        if(osver < 6) {
            androidPermDescTag = 'intro.appstatus.locperms.description.android-lt-6';
        } else if (osver < 10) {
            androidPermDescTag = "intro.appstatus.locperms.description.android-6-9";
        } else if (osver < 11) {
            androidPermDescTag= "intro.appstatus.locperms.description.android-10";
        } else if (osver < 12) {
            androidPermDescTag= "intro.appstatus.locperms.description.android-11";
        }
        console.log("description tags are "+androidSettingsDescTag+" "+androidPermDescTag);
        // location settings
        let locSettingsCheck = {
            name: t("intro.appstatus.locsettings.name"),
            desc: t(androidSettingsDescTag),
            statusState: false,
            fix: fixSettings,
            refresh: checkSettings
        }
        let locPermissionsCheck = {
            name: t("intro.appstatus.locperms.name"),
            desc: t(androidPermDescTag),
            statusState: false,
            fix: fixPerms,
            refresh: checkPerms
        }
        setLocChecks([locSettingsCheck, locPermissionsCheck]);
        refreshChecks(locChecks, recomputeLocStatus);
    }

    function setupIOSLocChecks() {
        let fixSettings = function() {
            console.log("Fix and refresh location settings");
            return checkOrFix(locSettingsCheck, window.cordova.plugins.BEMDataCollection.fixLocationSettings,
                recomputeLocStatus, true);
        };
        let checkSettings = function() {
            console.log("Refresh location settings");
            return checkOrFix(locSettingsCheck, window.cordova.plugins.BEMDataCollection.isValidLocationSettings,
                recomputeLocStatus, false);
        };
        let fixPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, window.cordova.plugins.BEMDataCollection.fixLocationPermissions,
                recomputeLocStatus, true).then((error) => locPermissionsCheck.desc = error);
        };
        let checkPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, window.cordova.plugins.BEMDataCollection.isValidLocationPermissions,
                recomputeLocStatus, false);
        };
        var iOSSettingsDescTag = "intro.appstatus.locsettings.description.ios";
        var iOSPermDescTag = "intro.appstatus.locperms.description.ios-gte-13";
        if(osver < 13) {
            iOSPermDescTag = 'intro.appstatus.locperms.description.ios-lt-13';
        }
        console.log("description tags are "+iOSSettingsDescTag+" "+iOSPermDescTag);
        //lower part of this code is not running??
        // location settings
        const locSettingsCheck = {
            name: t("intro.appstatus.locsettings.name"),
            desc: t(iOSSettingsDescTag),
            statusState: false,
            fix: fixSettings,
            refresh: checkSettings
        };
        const locPermissionsCheck = {
            name: t("intro.appstatus.locperms.name"),
            desc: t(iOSPermDescTag),
            statusState: false,
            fix: fixPerms,
            refresh: checkPerms
        };
        setLocChecks([locSettingsCheck, locPermissionsCheck]);
        console.log("loc check set to", locChecks);
        refreshChecks(locChecks, recomputeLocStatus);
    }

    function setupAndroidFitnessChecks() {
        setFitnessPermNeeded(osver >= 10);

        let fixPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, window.cordova.plugins.BEMDataCollection.fixFitnessPermissions,
                recomputeFitnessStatus, true).then((error) => fitnessPermissionsCheck.desc = error);
        };
        let checkPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, window.cordova.plugins.BEMDataCollection.isValidFitnessPermissions,
                recomputeFitnessStatus, false);
        };
  
        let fitnessPermissionsCheck = {
            name: t("intro.appstatus.fitnessperms.name"),
            desc: t("intro.appstatus.fitnessperms.description.android"),
            fix: fixPerms,
            refresh: checkPerms
        }
        setOverallFitnessName(t("intro.appstatus.overall-fitness-name-android"));
        setFitnessChecks([fitnessPermissionsCheck]);
        refreshChecks(fitnessChecks, recomputeFitnessStatus);
    }

    function setupIOSFitnessChecks() {
        setFitnessPermNeeded(true);

        let fixPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, window.cordova.plugins.BEMDataCollection.fixFitnessPermissions,
                recomputeFitnessStatus, true).then((error) => fitnessPermissionsCheck.desc = error);
        };
        let checkPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, window.cordova.plugins.BEMDataCollection.isValidFitnessPermissions,
                recomputeFitnessStatus, false);
        };
  
        let fitnessPermissionsCheck = {
            name: t("intro.appstatus.fitnessperms.name"),
            desc: t("intro.appstatus.fitnessperms.description.ios"),
            fix: fixPerms,
            refresh: checkPerms
        }
        setOverallFitnessName(t("intro.appstatus.overall-fitness-name-ios"));
        setFitnessChecks([fitnessPermissionsCheck]);
        refreshChecks(fitnessChecks, recomputeFitnessStatus);
    }

    function setupAndroidNotificationChecks() {
        let fixPerms = function() {
            console.log("fix and refresh notification permissions");
            return checkOrFix(appAndChannelNotificationsCheck, window.cordova.plugins.BEMDataCollection.fixShowNotifications,
                recomputeNotificationStatus, true);
        };
        let checkPerms = function() {
            console.log("fix and refresh notification permissions");
            return checkOrFix(appAndChannelNotificationsCheck, window.cordova.plugins.BEMDataCollection.isValidShowNotifications,
                recomputeNotificationStatus, false);
        };
        let appAndChannelNotificationsCheck = {
            name: t("intro.appstatus.notificationperms.app-enabled-name"),
            desc: t("intro.appstatus.notificationperms.description.android-enable"),
            fix: fixPerms,
            refresh: checkPerms
        }
        setNotificationChecks([appAndChannelNotificationsCheck]);
        refreshChecks(notificationChecks, recomputeNotificationStatus);
    }

    function setupAndroidBackgroundRestrictionChecks() {
        let fixPerms = function() {
            console.log("fix and refresh backgroundRestriction permissions");
            return checkOrFix(unusedAppsUnrestrictedCheck, window.cordova.plugins.BEMDataCollection.fixUnusedAppRestrictions,
                recomputeBackgroundRestrictionStatus, true);
        };
        let checkPerms = function() {
            console.log("fix and refresh backgroundRestriction permissions");
            return checkOrFix(unusedAppsUnrestrictedCheck, window.cordova.plugins.BEMDataCollection.isUnusedAppUnrestricted,
                recomputeBackgroundRestrictionStatus, false);
        };
        let fixBatteryOpt = function() {
            console.log("fix and refresh battery optimization permissions");
            return checkOrFix(ignoreBatteryOptCheck, window.cordova.plugins.BEMDataCollection.fixIgnoreBatteryOptimizations,
                recomputeBackgroundRestrictionStatus, true);
        };
        let checkBatteryOpt = function() {
            console.log("fix and refresh battery optimization permissions");
            return checkOrFix(ignoreBatteryOptCheck, window.cordova.plugins.BEMDataCollection.isIgnoreBatteryOptimizations,
                recomputeBackgroundRestrictionStatus, false);
        };
        var androidUnusedDescTag = "intro.appstatus.unusedapprestrict.description.android-disable-gte-12";
        if (osver < 12) {
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
        setBackgroundRestrictionChecks([unusedAppsUnrestrictedCheck, ignoreBatteryOptCheck]);
        refreshChecks(backgroundRestrictionChecks, recomputeBackgroundRestrictionStatus);
    }

    function setupPermissionText() {
        if(platform.toLowerCase() == "ios") {
          if(osver < 13) {
            setLocationPermExplanation(t("intro.permissions.locationPermExplanation-ios-lt-13"));
          } else {
            setLocationPermExplanation(t("intro.permissions.locationPermExplanation-ios-gte-13"));
          }
        }
  
        setBackgroundRestricted(false);
        if(window.device.manufacturer.toLowerCase() == "samsung") {
          setBackgroundRestricted(true);
          setAllowBackgroundInstructions(t("intro.allow_background.samsung"));
        }
  
        console.log("Explanation = "+locationPermExplanation);
    }

    function checkLocationServicesEnabled() {
        console.log("About to see if location services are enabled");
    }

    function setUpPermissions() {
        console.log("app is launched, should refresh");
        setPlatform(window.device.platform);
        console.log("window device", window.device.version.split(".")[0]);
        setOsver(window.device.version.split(".")[0]);
        setupPermissionText();
        setupLocChecks();
        setupFitnessChecks();
        setupNotificationChecks();
        setupBackgroundRestrictionChecks();
        console.log("done setting up, icons are", overallLocStatusIcon, overallFitnessStatusIcon, overallNotifStatusIcon, overallBackgroundRestrictionStatusIcon);
    };

    $ionicPlatform.on("resume", function() {
        console.log("PERMISSION CHECK: app has resumed, should refresh");
        refreshChecks(locChecks, recomputeLocStatus);
        refreshChecks(fitnessChecks, recomputeFitnessStatus);
        refreshChecks(notificationChecks, recomputeNotificationStatus);
        refreshChecks(backgroundRestrictionChecks, recomputeBackgroundRestrictionStatus);
        console.log("setting checks are", locChecks, fitnessChecks, notificationChecks, backgroundRestrictionChecks);
    });


    //how to do this?
    settingsScope.$on("recomputeAppStatus", function() {
        console.log("PERMISSION CHECK: recomputing state");
        Promise.all([
            refreshChecks(locChecks, recomputeLocStatus),
            refreshChecks(fitnessChecks, recomputeFitnessStatus),
            refreshChecks(notificationChecks, recomputeNotificationStatus),
            refreshChecks(backgroundRestrictionChecks, recomputeBackgroundRestrictionStatus)
        ]).then( () => {
            console.log("overall status is", overallStatus);
        }
        );
    });

    return (
        <Modal visible={permitVis} onDismiss={() => setPermitVis(false)} transparent={true}>
                <Dialog visible={permitVis} 
                        onDismiss={() => setPermitVis(false)} 
                        style={dialogStyle}>
                    <Dialog.Title>{t('consent.permissions')}</Dialog.Title>
                    <Dialog.Content>
                        <Text>{t('intro.appstatus.overall-description')}</Text>
                        <List.Accordion
                            title={t('intro.appstatus.overall-loc-name')}
                            description={t('intro.appstatus.overall-loc-description')}
                            left={() => <List.Icon icon={overallLocStatusIcon} />}
                            expanded={locExpanded}
                            onPress={locPress} >
                            {locChecks?.map((lc) => 
                                <PermissionItem 
                                    name={lc.name}
                                    statusIcon={lc.statusIcon}
                                    fixAction={lc.fix}
                                    refreshAction={lc.refresh}
                                >
                                </PermissionItem>
                            )}
                        </List.Accordion>
                        <List.Accordion
                            title={overallFitnessName}
                            description={t('intro.appstatus.overall-fitness-description')}
                            left={() => <List.Icon icon={overallFitnessStatusIcon} />}
                            expanded={fitExpanded}
                            onPress={fitPress}>
                        </List.Accordion>
                        <List.Accordion
                            title={t('intro.appstatus.overall-notification-name')}
                            description={t('intro.appstatus.overall-notification-description')}
                            left={() => <List.Icon icon={overallNotifStatusIcon} />}
                            expanded={notifExpanded}
                            onPress={notifPress}>
                        </List.Accordion>
                        <List.Accordion
                            title={t('intro.appstatus.overall-background-restrictions-name')}
                            description={t('intro.appstatus.overall-background-restrictions-description')}
                            left={() => <List.Icon icon={overallBackgroundRestrictionStatusIcon} />}
                            expanded={backgroundExpanded}
                            onPress={backgroundPress}>
                        </List.Accordion>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button 
                            onPress={() => setPermitVis(false)}
                            disabled={status}>
                            {t('control.button-accept')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>
    )
}

angularize(AppStatusModal, 'AppStatus', 'emission.main.control.appStatusModal'); 
export default AppStatusModal;