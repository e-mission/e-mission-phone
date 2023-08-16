//this comes up for checkAppStatus, and when needed?
//will probably change when we update introduction
import React, { useState, useEffect } from "react";
import { Modal,  useWindowDimensions, ScrollView } from "react-native";
import { Dialog, Button, Text, useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { getAngularService } from "../angular-react-helper";
import PermissionItem from "../appstatus/PermissionItem";
import useAppConfig from "../useAppConfig";
import ExplainPermissions from "../appstatus/ExplainPermissions";

const AppStatusModal = ({permitVis, setPermitVis, status, dialogStyle}) => {
    const { t } = useTranslation();
    //const { colors } = useTheme();
    const { appConfig, loading } = useAppConfig();

    const { height: windowHeight } = useWindowDimensions();

    const [explainVis, setExplainVis] = useState(false);

    const $ionicPlatform = getAngularService("$ionicPlatform");

    const [osver, setOsver] = useState(0);
    const [platform, setPlatform] = useState("");

    const [backgroundUnrestrictionsNeeded, setBackgroundUnrestrictionsNeeded] = useState(false);
    const [backgroundRestricted, setBackgroundRestricted] = useState(false);
    const [allowBackgroundInstructions, setAllowBackgroundInstructions] = useState([]);

    const [overallStatus, setOverallStatus] = useState(false);

    const [fitnessPermNeeded, setFitnessPermNeeded] = useState(false);

    const [checkList, setCheckList] = useState([]);
    const [explanationList, setExplanationList] = useState([]);
    const [haveSetText, setHaveSetText] = useState(false);

    const mainControlEl = document.getElementById('main-control').querySelector('ion-view');
    const settingsScope = angular.element(mainControlEl).scope();
    console.log("settings scope", settingsScope);

    //load when ready
    useEffect(() => {
        if (appConfig) {
            setPlatform(window['device'].platform.toLowerCase());
            setOsver(window['device'].version.split(".")[0]);

            if(!haveSetText)
            {
                setupPermissionText();
                setHaveSetText(true);
            }

            console.log("setting up permissions");
            createChecklist();
        }
    }, [appConfig]);

    function createChecklist(){
        if(platform == "android") {
            setupAndroidLocChecks();
            setupAndroidFitnessChecks();
            setupAndroidNotificationChecks();
            setupAndroidBackgroundRestrictionChecks();
        } else if (platform == "ios") {
            setupIOSLocChecks();
            setupIOSFitnessChecks();
            setupAndroidNotificationChecks();
        } else {
            console.log("Alert! unknownplatform, no tracking"); //need an alert, can use AlertBar?
        }
        
        refreshAllChecks();
    }

    let iconMap = (statusState) => statusState ? "check-circle-outline" : "alpha-x-circle-outline";
    let classMap = (statusState) => statusState ? "status-green" : "status-red";

    function recomputeOverallStatus() {
        let status = true;
        checkList.forEach((lc) => {
            if(!lc.statusState){
                status = false;
            }
        })
        setOverallStatus(status);
    }

    function checkOrFix(checkObj, nativeFn, showError=true) {
        return nativeFn()
            .then((status) => {
                console.log("availability ", status)
                checkObj.statusState = true;
                recomputeAllChecks();
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
                recomputeAllChecks();
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
                true).then((error) => locPermissionsCheck.desc = error);
        };
        let checkPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, window['cordova'].plugins.BEMDataCollection.isValidLocationPermissions, false);
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
                true).then((error) => locPermissionsCheck.desc = error);
        };
        let checkPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, window['cordova'].plugins.BEMDataCollection.isValidLocationPermissions,
                false);
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
        let tempChecks = checkList;
        tempChecks.push(locSettingsCheck, locPermissionsCheck);
        setCheckList(tempChecks);
    }

    function setupAndroidFitnessChecks() {
        if(osver >= 10){
            let fixPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, window['cordova'].plugins.BEMDataCollection.fixFitnessPermissions,
                true).then((error) => fitnessPermissionsCheck.desc = error);
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
                true).then((error) => fitnessPermissionsCheck.desc = error);
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
        let tempChecks = checkList;
        tempChecks.push(unusedAppsUnrestrictedCheck, ignoreBatteryOptCheck);
        setCheckList(tempChecks);
    }

    function setupPermissionText() {
        let tempExplanations = explanationList;

        let overallFitnessName = t('intro.appstatus.overall-fitness-name-android');
        let locExplanation = t('intro.appstatus.overall-loc-description');
        if(platform == "ios") {
            overallFitnessName = t('intro.appstatus.overall-fitness-name-ios');
            if(osver < 13) {
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
  
        //I don't see this applied anywhere pre-migration
        //message is about medium accuracy settings
        //should there be a check set up for this??
        setBackgroundRestricted(false);
        if(window['device'].manufacturer.toLowerCase() == "samsung") {
          setBackgroundRestricted(true);
          setAllowBackgroundInstructions(t("intro.allow_background.samsung"));
        }
  
        console.log("Explanation = "+explanationList);
    }

    function refreshAllChecks() {
        //refresh each check
        checkList.forEach((lc) => {
            lc.refresh();
        });
        console.log("setting checks are", checkList);
        recomputeOverallStatus();
    }
     function recomputeAllChecks() {
        //recompute each check
        checkList.forEach((lc) => {
            lc.statusIcon = iconMap(lc.statusState);
            lc.statusClass = classMap(lc.statusState)
        });
        recomputeOverallStatus();
        console.log("setting checks are", checkList);
     }

    $ionicPlatform.on("resume", function() {
        console.log("PERMISSION CHECK: app has resumed, should refresh");
        refreshAllChecks();
    });

    //how to do this?
    //recomputeAppStatus comes from the plugins?
    settingsScope.$on("recomputeAppStatus", function() {
        console.log("PERMISSION CHECK: recomputing state");
        refreshAllChecks();
    });

    return (
        <Modal visible={permitVis} onDismiss={() => setPermitVis(false)} transparent={true}>
                <Dialog visible={permitVis} 
                        onDismiss={() => setPermitVis(false)} 
                        style={dialogStyle}>
                    <Dialog.Title>{t('consent.permissions')}</Dialog.Title>
                    <Dialog.Content  style={{maxHeight: windowHeight/1.5, paddingBottom: 0}}>
                        <ScrollView persistentScrollbar={true}>
                            <Text>{t('intro.appstatus.overall-description')}</Text>
                            <Button 
                                onPress={() => setExplainVis(true)}>
                                {"What are these used for?"}
                            </Button>
                            <ExplainPermissions explanationList={explanationList} visible={explainVis} setVisible={setExplainVis}></ExplainPermissions>
                            {checkList?.map((lc) => 
                                    <PermissionItem 
                                        key={lc.name}
                                        name={lc.name}
                                        description={lc.desc}
                                        statusIcon={lc.statusIcon}
                                        fixAction={lc.fix}
                                    >
                                    </PermissionItem>
                                )}
                        </ScrollView>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button 
                            onPress={() => refreshAllChecks()}>
                            {t('intro.appstatus.refresh')}
                        </Button>
                        <Button 
                            onPress={() => setPermitVis(false)}
                            disabled={!overallStatus}>
                            {t('control.button-accept')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>
    )
}

export default AppStatusModal;