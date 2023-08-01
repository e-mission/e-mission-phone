import React, { useState, useEffect } from "react";
import { Modal, StyleSheet, Platform } from "react-native";
import { Dialog, Button, useTheme, Text } from "react-native-paper";
import { angularize, getAngularService } from "../angular-react-helper";
import { useTranslation } from "react-i18next";
import ExpansionSection from "./ExpandMenu";
import SettingRow from "./SettingRow";
import ControlDataTable from "./ControlDataTable";
import DemographicsSettingRow from "./DemographicsSettingRow";
import PopOpCode from "./PopOpCode";
import ReminderTime from "./ReminderTime"
import useAppConfig from "../useAppConfig";
import AlertBar from "./AlertBar";

let controlUpdateCompleteListenerRegistered = false;

//any pure functions can go outside
const ProfileSettings = () => {
    // anything that mutates must go in --- depend on props or state... 
    const { t } = useTranslation();
    const { appConfig, loading } = useAppConfig();
    const { colors } = useTheme();

    // get the scope of the general-settings.js file
    const mainControlEl = document.getElementById('main-control').querySelector('ion-view');
    const settingsScope = angular.element(mainControlEl).scope();
    
    // grab any variables or functions we need from it like this:
    const { settings, viewPrivacyPolicy, openDatePicker, showLog, showSensed, overallAppStatus } = settingsScope;

    console.log("app status", overallAppStatus);

    //angular services needed
    const CarbonDatasetHelper = getAngularService('CarbonDatasetHelper');
    const UploadHelper = getAngularService('UploadHelper');
    const EmailHelper = getAngularService('EmailHelper');
    const ControlCollectionHelper = getAngularService('ControlCollectionHelper');
    const ControlSyncHelper = getAngularService('ControlSyncHelper');
    const CalorieCal = getAngularService('CalorieCal');
    const KVStore = getAngularService('KVStore');
    const NotificationScheduler = getAngularService('NotificationScheduler');
    const ControlHelper = getAngularService('ControlHelper');
    const ClientStats = getAngularService('ClientStats');
    const StartPrefs = getAngularService('StartPrefs');

    if (!controlUpdateCompleteListenerRegistered) {
        settingsScope.$on('control.update.complete', function() {
            console.debug("Received control.update.complete event, refreshing screen");
            refreshScreen();
            refreshCollectSettings();
        });
        controlUpdateCompleteListenerRegistered = true;
    }

    //functions that come directly from an Angular service
    const editCollectionConfig = ControlCollectionHelper.editConfig;
    const editSyncConfig = ControlSyncHelper.editConfig;

    //states and variables used to control/create the settings
    const [opCodeVis, setOpCodeVis] = useState(false);
    const [nukeSetVis, setNukeVis] = useState(false);
    const [carbonDataVis, setCarbonDataVis] = useState(false);
    const [forceStateVis, setForceStateVis] = useState(false);
    const [permitVis, setPermitVis] = useState(false);
    const [logoutVis, setLogoutVis] = useState(false);
    const [dataPendingVis, setDataPendingVis] = useState(false);
    const [dataPushedVis, setDataPushedVis] = useState(false);
    const [userDataVis, setUserDataVis] = useState(false);
    const [invalidateSuccessVis, setInvalidateSuccessVis] = useState(false);
    const [noConsentVis, setNoConsentVis] = useState(false);
    const [noConsentMessageVis, setNoConsentMessageVis] = useState(false);
    const [consentVis, setConsentVis] = useState(false);

    const [collectSettings, setCollectSettings] = useState({});
    const [notificationSettings, setNotificationSettings] = useState({});
    const [authSettings, setAuthSettings] = useState({});
    const [userData, setUserData] = useState([]);
    const [rawUserData, setRawUserData] = useState({});
    const [syncSettings, setSyncSettings] = useState({});
    const [cacheResult, setCacheResult] = useState("");
    const [connectSettings, setConnectSettings] = useState({});
    const [appVersion, setAppVersion] = useState({});
    const [uiConfig, setUiConfig] = useState({});
    const [consentDoc, setConsentDoc] = useState({});

    let carbonDatasetString = t('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();
    const carbonOptions = CarbonDatasetHelper.getCarbonDatasetOptions();
    const stateActions = [{text: "Initialize", transition: "INITIALIZE"},
    {text: 'Start trip', transition: "EXITED_GEOFENCE"},
    {text: 'End trip', transition: "STOPPED_MOVING"},
    {text: 'Visit ended', transition: "VISIT_ENDED"},
    {text: 'Visit started', transition: "VISIT_STARTED"},
    {text: 'Remote push', transition: "RECEIVED_SILENT_PUSH"}]

    useEffect(() => {
        //added appConfig.name needed to be defined because appConfig was defined but empty
        if (appConfig && (appConfig.name)) {
            whenReady(appConfig);
        }
    }, [appConfig]);

    const refreshScreen = function() {
        refreshCollectSettings();
        refreshNotificationSettings();
        getOPCode();
        getUserData(); //loading slow "one step behind" -- hoping further migration works it out
        getSyncSettings();
        getConnectURL();
        setAppVersion(ClientStats.getAppVersion());
    }

    const whenReady = function(newAppConfig){
        var tempUiConfig = newAppConfig;

         // backwards compat hack to fill in the raw_data_use for programs that don't have it
         const default_raw_data_use = {
            "en": `to monitor the ${tempUiConfig.intro.program_or_study}, send personalized surveys or provide recommendations to participants`,
            "es": `para monitorear el ${tempUiConfig.intro.program_or_study}, enviar encuestas personalizadas o proporcionar recomendaciones a los participantes`
        }
        Object.entries(tempUiConfig.intro.translated_text).forEach(([lang, val]) => {
            val.raw_data_use = val.raw_data_use || default_raw_data_use[lang];
        });

        // Backwards compat hack to fill in the `app_required` based on the
        // old-style "program_or_study"
        // remove this at the end of 2023 when all programs have been migrated over
        if (tempUiConfig.intro.app_required == undefined) {
            tempUiConfig.intro.app_required = tempUiConfig?.intro.program_or_study == 'program';
        }
        tempUiConfig.opcode = tempUiConfig.opcode || {};
        if (tempUiConfig.opcode.autogen == undefined) {
            tempUiConfig.opcode.autogen = tempUiConfig?.intro.program_or_study == 'study';
        }
        
        // setTemplateText(tempUiConfig.intro.translated_text);
        // console.log("translated text is??", templateText);
        setUiConfig(tempUiConfig);
        refreshScreen();
    }

    async function refreshCollectSettings() {
        console.debug('about to refreshCollectSettings, collectSettings = ', collectSettings);
        const newCollectSettings = {};

        // refresh collect plugin configuration
        const collectionPluginConfig = await ControlCollectionHelper.getCollectionSettings();
        newCollectSettings.config = collectionPluginConfig;
        
        const collectionPluginState = await ControlCollectionHelper.getState();
        newCollectSettings.state = collectionPluginState;
        newCollectSettings.trackingOn = collectionPluginState != "local.state.tracking_stopped"
                                        && collectionPluginState != "STATE_TRACKING_STOPPED";

        // I am not sure that this is actually needed anymore since https://github.com/e-mission/e-mission-data-collection/commit/92f41145e58c49e3145a9222a78d1ccacd16d2a7
        const geofenceConfig = await KVStore.get("OP_GEOFENCE_CFG");
        newCollectSettings.experimentalGeofenceOn = geofenceConfig != null;

        const isLowAccuracy = ControlCollectionHelper.isMediumAccuracy();
        if (typeof isLowAccuracy != 'undefined') {
            newCollectSettings.lowAccuracy = isLowAccuracy;
        }

        setCollectSettings(newCollectSettings);
    }

    async function refreshNotificationSettings() {
        console.debug('about to refreshNotificationSettings, notificationSettings = ', notificationSettings);
        const newNotificationSettings ={};

        if (uiConfig?.reminderSchemes) {
            const prefs = await  NotificationScheduler.getReminderPrefs();
            const m = moment(prefs.reminder_time_of_day, 'HH:mm');
            newNotificationSettings.prefReminderTimeVal = m.toDate();
            const n = moment(newNotificationSettings.prefReminderTimeVal);
            newNotificationSettings.prefReminderTime = n.format('LT');
            newNotificationSettings.prefReminderTimeOnLoad = prefs.reminder_time_of_day;
            newNotificationSettings.scheduledNotifs = await NotificationScheduler.getScheduledNotifs();
            updatePrefReminderTime(false);
        }

        console.log("notification settings before and after", notificationSettings, newNotificationSettings);
        setNotificationSettings(newNotificationSettings);
    }

    async function getUserData() {
        return CalorieCal.get().then(function(userDataFromStorage) {
        setRawUserData(userDataFromStorage);
        if (userDataSaved()) {
            var newUserData = []
            var height = userDataFromStorage.height.toString();
            var weight = userDataFromStorage.weight.toString();
            var temp  =  {
                age: userDataFromStorage.age,
                height: height + (userDataFromStorage.heightUnit == 1? ' cm' : ' ft'),
                weight: weight + (userDataFromStorage.weightUnit == 1? ' kg' : ' lb'),
                gender: userDataFromStorage.gender == 1? i18next.t('gender-male') : i18next.t('gender-female')
            }
            for (var i in temp) {
                newUserData.push({key: i, val: temp[i]}); //needs to be val for the data table!
            }
            setUserData(newUserData);
        }
        });
    }

    async function getSyncSettings() {
        console.log("getting sync settings");
        var newSyncSettings = {};
        ControlSyncHelper.getSyncSettings().then(function(showConfig) {
            newSyncSettings.show_config = showConfig;
            setSyncSettings(newSyncSettings);
            console.log("sync settings are ", syncSettings);
        });
    };

    async function getConnectURL() {
        ControlHelper.getSettings().then(function(response) {
            var newConnectSettings ={}
            newConnectSettings.url = response.connectUrl;
            console.log(response);
            setConnectSettings(newConnectSettings);
        }, function(error) {
            Logger.displayError("While getting connect url", error);
        });
    }

    const userDataSaved = function() {
        if (rawUserData && rawUserData != null) {
            return rawUserData.userDataSaved;
        } else {
            return false;
        }
    }

    async function eraseUserData() {
        CalorieCal.delete().then(function() {
           setUserDataVis(true);
        });
        newRefreshScreen();
    }

    async function getOPCode() {
        const newAuthSettings = {};
        const opcode = await ControlHelper.getOPCode();
        if(opcode == null){
            newAuthSettings.opcode = "Not logged in";
        } else {
            newAuthSettings.opcode = opcode;
        }
        setAuthSettings(newAuthSettings);
    };
    
    //methods that control the settings
    const uploadLog = function () {
        UploadHelper.uploadFile("loggerDB")
    };

    const emailLog = function () {
        // Passing true, we want to send logs
        EmailHelper.sendEmail("loggerDB")
    };

    async function  updatePrefReminderTime(storeNewVal=true, newTime){
        console.log(newTime);
        if(storeNewVal){
            const m = moment(newTime);
            // store in HH:mm
            NotificationScheduler.setReminderPrefs({ reminder_time_of_day: m.format('HH:mm') }).then(() => {
                refreshNotificationSettings();
            }); 
        }
    }

    function dummyNotification() {
        cordova.plugins.notification.local.addActions('dummy-actions', [
            { id: 'action', title: 'Yes' },
            { id: 'cancel', title: 'No' }
        ]);
        cordova.plugins.notification.local.schedule({
            id: new Date().getTime(),
            title: 'Dummy Title',
            text: 'Dummy text',
            actions: 'dummy-actions',
            trigger: {at: new Date(new Date().getTime() + 5000)},
        });
    }

    async function userStartStopTracking() {
        const transitionToForce = collectSettings.trackingOn ? 'STOP_TRACKING' : 'START_TRACKING';
        ControlCollectionHelper.forceTransition(transitionToForce);
        /* the ControlCollectionHelper.forceTransition call above will trigger a
            'control.update.complete' event when it's done, which will trigger refreshCollectSettings.
          So we don't need to call refreshCollectSettings here. */
    }

    const toggleLowAccuracy = function() {
        ControlCollectionHelper.toggleLowAccuracy();
        refreshCollectSettings();
    }

    const shareQR = function() {
        var prepopulateQRMessage = {};  
        var qrAddress = "emission://login_token?token="+settings?.auth?.opcode;
        prepopulateQRMessage.files = [qrAddress];
        prepopulateQRMessage.url = settings.auth.opcode;

        window.plugins.socialsharing.shareWithOptions(prepopulateQRMessage, function(result) {
            console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
            console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
        }, function(msg) {
            console.log("Sharing failed with message: " + msg);
        });
    }

    const viewQRCode = function(e) {
        setOpCodeVis(true);
    }

    var prepopulateMessage = {
        message: t('general-settings.share-message'),
        subject: t('general-settings.share-subject'),
        url: t('general-settings.share-url')
    }

    const share = function() {
        window.plugins.socialsharing.shareWithOptions(prepopulateMessage, function(result) {
                console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
                console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
            }, function(msg) {
                console.log("Sharing failed with message: " + msg);
            });
    }
    
    const clearNotifications = function() {
        window.cordova.plugins.notification.local.clearAll();
    }

    //Platform.OS returns "web" now, but could be used once it's fully a Native app
    //for now, use window.cordova.platformId

    // helper functions for endForceSync
    const getStartTransitionKey = function() {
        if(window.cordova.platformId == 'android') {
            return "local.transition.exited_geofence";
        }
        else if(window.cordova.platformId == 'ios') {
            return "T_EXITED_GEOFENCE";
        }
    }

    const getEndTransitionKey = function() {
        if(window.cordova.platformId == 'android') {
            return "local.transition.stopped_moving";
        }
        else if(window.cordova.platformId == 'ios') {
            return "T_TRIP_ENDED";
        }
    }

    const getOngoingTransitionState = function() {
        if(window.cordova.platformId == 'android') {
            return "local.state.ongoing_trip";
        }
        else if(window.cordova.platformId == 'ios') {
            return "STATE_ONGOING_TRIP";
        }
    }

    async function getTransition(transKey) {
        var entry_data = {};
        const curr_state = await ControlCollectionHelper.getState();
        entry_data.curr_state = curr_state;
        if (transKey == getEndTransitionKey()) {
            entry_data.curr_state = getOngoingTransitionState();
        }
        entry_data.transition = transKey;
        entry_data.ts = moment().unix();
        return entry_data;
    }

    const parseState = function(state) {
        console.log("state in parse state is", state);
        if (state) {
            console.log("state in parse state exists", window.cordova.platformId);
            if(window.cordova.platformId == 'android') {
                console.log("ANDROID state in parse state is", state.substring(12));
                return state.substring(12);
            }
            else if(window.cordova.platformId == 'ios') {
                console.log("IOS state in parse state is", state.substring(6));
                return state.substring(6);
            }
        }
    }

    async function endForceSync() {
        /* First, quickly start and end the trip. Let's listen to the promise
         * result for start so that we ensure ordering */
        var sensorKey = "statemachine/transition";
        return getTransition(getStartTransitionKey()).then(function(entry_data) {
            return window.cordova.plugins.BEMUserCache.putMessage(sensorKey, entry_data);
        }).then(function() {
                return getTransition(getEndTransitionKey()).then(function(entry_data) {
                    return window.cordova.plugins.BEMUserCache.putMessage(sensorKey, entry_data);
                })
        }).then(forceSync);
    }

    //showing up in an odd space on the screen!!
    async function forceSync() {
        ClientStats.addEvent(ClientStats.getStatKeys().BUTTON_FORCE_SYNC).then(
            function() {
                console.log("Added "+ClientStats.getStatKeys().BUTTON_FORCE_SYNC+" event");
            });
        ControlSyncHelper.forceSync().then(function() {
            /*
             * Change to sensorKey to "background/location" after fixing issues
             * with getLastSensorData and getLastMessages in the usercache
             * See https://github.com/e-mission/e-mission-phone/issues/279 for details
             */
            var sensorKey = "statemachine/transition";
            return window.cordova.plugins.BEMUserCache.getAllMessages(sensorKey, true);
        }).then(function(sensorDataList) {
            Logger.log("sensorDataList = "+JSON.stringify(sensorDataList));
            // If everything has been pushed, we should
            // only have one entry for the battery, which is the one that was
            // inserted on the last successful push.
            var isTripEnd = function(entry) {
                if (entry.metadata.key == getEndTransitionKey()) {
                    return true;
                } else {
                    return false;
                }
            };
            var syncLaunchedCalls = sensorDataList.filter(isTripEnd);
            var syncPending = (syncLaunchedCalls.length > 0);
            Logger.log("sensorDataList.length = "+sensorDataList.length+
                       ", syncLaunchedCalls.length = "+syncLaunchedCalls.length+
                       ", syncPending? = "+syncPending);
            return syncPending;
        }).then(function(syncPending) {
            Logger.log("sync launched = "+syncPending);
            if (syncPending) {
                Logger.log("data is pending, showing confirm dialog");
                setDataPendingVis(true); //consent handling in modal
            } else {
                setDataPushedVis(true);
            }
        }).catch(function(error) {
            Logger.displayError("Error while forcing sync", error);
        });
    };

    async function invalidateCache() {
        window.cordova.plugins.BEMUserCache.invalidateAllCache().then(function(result) {
            console.log("invalidate result", result);
            setCacheResult(result);
            setInvalidateSuccessVis(true);
        }, function(error) {
            Logger.displayError("while invalidating cache, error->", error);
        });
    }

    //in ProfileSettings in DevZone (above two functions are helpers)
    async function checkConsent() {
        StartPrefs.getConsentDocument().then(function(resultDoc){
            setConsentDoc(resultDoc);
            if (resultDoc == null) {
                setNoConsentVis(true);
            } else {
                setConsentVis(true);
            }
        }, function(error) {
            Logger.displayError("Error reading consent document from cache", error)
        });
    }

    //conditional creation of setting sections
    let userDataSection;
    if(userDataSaved())
    {
        userDataSection = <ExpansionSection sectionTitle="control.user-data">
                            <SettingRow textKey="control.erase-data" iconName="delete-forever" action={eraseUserData}></SettingRow>
                            <ControlDataTable controlData={userData}></ControlDataTable>
                        </ExpansionSection>;
    }

    let logUploadSection;
    console.debug("appConfg: support_upload:", appConfig?.profile_controls?.support_upload);
    if (appConfig?.profile_controls?.support_upload) {
        logUploadSection = <SettingRow textKey="control.upload-log" iconName="cloud" action={uploadLog}></SettingRow>;
    }

    let timePicker;
    let notifSchedule;
    if (appConfig?.reminderSchemes)
    {
        timePicker = <ReminderTime rowText={"control.reminders-time-of-day"} timeVar={notificationSettings.prefReminderTime} defaultTime={notificationSettings.prefReminderTimeVal} updateFunc={updatePrefReminderTime}></ReminderTime>;
        notifSchedule = <><SettingRow textKey="control.upcoming-notifications" iconName="bell-check" action={()=>console.log("")}></SettingRow>
                          <ControlDataTable controlData={notificationSettings.scheduledNotifs}></ControlDataTable></>
    }

    return (
        <>
           <SettingRow textKey="control.profile" iconName='logout' action={() => setLogoutVis(true)} desc={authSettings.opcode} descStyle={styles.monoDesc}></SettingRow>
           <DemographicsSettingRow></DemographicsSettingRow>
           <SettingRow textKey='control.view-privacy' iconName='eye' action={viewPrivacyPolicy}></SettingRow>
           <SettingRow textKey="control.view-qrc" iconName="grid" action={viewQRCode}></SettingRow>
           {timePicker}
           <SettingRow textKey="control.tracking" action={userStartStopTracking} switchValue={collectSettings.trackingOn}></SettingRow>
           <SettingRow textKey="control.app-status" iconName="check" action={() => setPermitVis(true)}></SettingRow>
           <SettingRow textKey="control.medium-accuracy" action={toggleLowAccuracy} switchValue={collectSettings.lowAccuracy}></SettingRow>
           <SettingRow textKey={carbonDatasetString} iconName="database-cog" action={() => setCarbonDataVis(true)}></SettingRow>
           <SettingRow textKey="control.force-sync" iconName="sync" action={forceSync}></SettingRow>
           <SettingRow textKey="control.share" iconName="share" action={share}></SettingRow>
           <SettingRow textKey="control.download-json-dump" iconName="calendar" action={openDatePicker}></SettingRow>
           {logUploadSection}
           <SettingRow textKey="control.email-log" iconName="email" action={emailLog}></SettingRow>

            {userDataSection}
           
           <ExpansionSection sectionTitle="control.dev-zone">
               <SettingRow textKey="control.refresh" iconName="refresh" action={refreshScreen}></SettingRow>
               <SettingRow textKey="control.end-trip-sync" iconName="sync-alert" action={endForceSync}></SettingRow>
               <SettingRow textKey="control.check-consent" iconName="check" action={checkConsent}></SettingRow>
               <SettingRow textKey="control.dummy-notification" iconName="bell" action={dummyNotification}></SettingRow>
               {notifSchedule}
               <SettingRow textKey="control.invalidate-cached-docs" iconName="delete" action={invalidateCache}></SettingRow>
               <SettingRow textKey="control.nuke-all" iconName="delete-forever" action={() => setNukeVis(true)}></SettingRow>
               <SettingRow textKey={parseState(collectSettings.state)} iconName="pencil" action={() => setForceStateVis(true)}></SettingRow>
               <SettingRow textKey="control.check-log" iconName="arrow-expand-right" action={showLog}></SettingRow>
               <SettingRow textKey="control.check-sensed-data" iconName="arrow-expand-right" action={showSensed}></SettingRow>
               <SettingRow textKey="control.collection" iconName="pencil" action={editCollectionConfig}></SettingRow>
               <ControlDataTable controlData={collectSettings.config}></ControlDataTable>
               <SettingRow textKey="control.sync" iconName="pencil" action={editSyncConfig}></SettingRow>
               <ControlDataTable controlData={syncSettings.show_config}></ControlDataTable>
               <SettingRow textKey="control.app-version" iconName="application" action={()=>console.log("")} desc={appVersion}></SettingRow>
           </ExpansionSection>

            {/* menu for "nuke data" */}
            <Modal visible={nukeSetVis} onDismiss={() => setNukeVis(false)}
            transparent={true}>
                <Dialog visible={nukeSetVis}
                onDismiss={() => setNukeVis(false)}
                style={styles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{t('general-settings.clear-data')}</Dialog.Title>
                    <Dialog.Content>
                        <Button onPress={() => {KVStore.clearOnlyLocal;
                                                setNukeVis(false);}}>
                            {t('general-settings.nuke-ui-state-only')}
                        </Button>
                        <Button onPress={() => {KVStore.clearOnlyNative;
                                                setNukeVis(false);}}>
                            {t('general-settings.nuke-native-cache-only')}
                        </Button>
                        <Button onPress={() => {KVStore.clearAll;
                                                setNukeVis(false);}}>
                            {t('general-settings.nuke-everything')}
                        </Button>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setNukeVis(false)}>{t('general-settings.cancel')}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            {/* menu for "set carbon dataset - only somewhat working" */}
            <Modal visible={carbonDataVis} onDismiss={() => setCarbonDataVis(false)}
            transparent={true}>
                <Dialog visible={carbonDataVis}
                    onDismiss={() => setCarbonDataVis(false)}
                    style={styles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{t('general-settings.choose-dataset')}</Dialog.Title>
                    <Dialog.Content>
                        {carbonOptions.map((e) =>
                            <Button key={e.text}
                            onPress={() =>  {
                                console.log("changeCarbonDataset(): chose locale " + e.value);
                                CarbonDatasetHelper.saveCurrentCarbonDatasetLocale(e.value); //there's some sort of error here
                                //Unhandled Promise Rejection: While logging, error -[NSNull UTF8String]: unrecognized selector sent to instance 0x7fff8a625fb0
                                carbonDatasetString = i18next.t('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();
                                setCarbonDataVis(false);
                                }}
                            >
                                {e.text}
                            </Button>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => {setCarbonDataVis(false);
                                                clearNotifications(); }}>{t('general-settings.cancel')}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            {/* force state sheet */}
            <Modal visible={forceStateVis} onDismiss={() => setForceStateVis(false)}
            transparent={true}>
                <Dialog visible={forceStateVis}
                    onDismiss={() => setForceStateVis(false)}
                    style={styles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{"Force State"}</Dialog.Title>
                    <Dialog.Content>
                        {stateActions.map((e) =>
                            <Button key={e.text}
                            onPress={() =>  {
                                console.log("changeCarbonDataset(): chose locale " + e.text);
                                ControlCollectionHelper.forceTransition(e.transition); 
                                setForceStateVis(false);
                                }}
                            >
                                {e.text}
                            </Button>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setForceStateVis(false)}>{t('general-settings.cancel')}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            {/* opcode viewing popup */}
            <PopOpCode visibilityValue = {opCodeVis} setVis = {setOpCodeVis} tokenURL = {"emission://login_token?token="+settings?.auth?.opcode} action={shareQR}></PopOpCode>

            {/* {view permissions} 
                need to add in the permissions here? its own element?? */}
            <Modal visible={permitVis} onDismiss={() => setPermitVis(false)} transparent={true}>
                <Dialog visible={permitVis} 
                        onDismiss={() => setPermitVis(false)} 
                        style={styles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{t('consent.permissions')}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="">{t('intro.appstatus.overall-description')}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setPermitVis(false)} /*disabled={!overallAppStatus} something to figure out here*/>{
                        t('control.button-accept')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            {/* logout menu */}
            <Modal visible={logoutVis} onDismiss={() => setLogoutVis(false)} transparent={true}>
                <Dialog visible={logoutVis} 
                        onDismiss={() => setLogoutVis(false)} 
                        style={styles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{t('general-settings.are-you-sure')}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="">{t('general-settings.log-out-warning')}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={()=>setLogoutVis(false)}>
                            {t('general-settings.cancel')}
                        </Button>
                        <Button onPress={() => {
                           const CONFIG_PHONE_UI="config/app_ui_config";
                           window.cordova.plugins.BEMUserCache.putRWDocument(CONFIG_PHONE_UI, {})
                               .then(window.location.reload(true));
                        }}>
                            {t('general-settings.confirm')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            {/* dataPending */}
            <Modal visible={dataPendingVis} onDismiss={()=>setDataPendingVis(false)} transparent={true}>
                <Dialog visible={dataPendingVis} 
                        onDismiss={()=>setDataPendingVis(false)} 
                        style={styles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{t('data pending for push')}</Dialog.Title>
                    <Dialog.Actions>
                        <Button onPress={()=>{
                            setDataPendingVis(false);
                            Logger.log("user refused to re-sync")}}>
                                {t('general-settings.cancel')}
                        </Button>
                        <Button onPress={()=>{
                            setDataPendingVis(false);
                            forceSync();}}>
                                {t('general-settings.confirm')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            {/* handle no consent */}
            <Modal visible={noConsentVis} onDismiss={()=>setNoConsentVis(false)} transparent={true}>
                <Dialog visible={noConsentVis} 
                        onDismiss={()=>setNoConsentVis(false)} 
                        style={styles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{t('general-settings.consent-not-found')}</Dialog.Title>
                    <Dialog.Actions>
                        <Button onPress={()=>{
                            setNoConsentVis(false);
                            setNoConsentMessageVis(true)}}>
                                {t('general-settings.cancel')}
                        </Button>
                        <Button onPress={()=>{
                            setNoConsentVis(false);
                            // $state.go("root.reconsent"); //don't know how to do this yet
                            }}>
                                {t('general-settings.confirm')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            {/* handle consent */}
            <Modal visible={consentVis} onDismiss={()=>setConsentVis(false)} transparent={true}>
                <Dialog visible={consentVis} 
                        onDismiss={()=>setConsentVis(false)} 
                        style={styles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{t('general-settings.consented-to', {protocol_id: consentDoc.protocol_id, approval_date: consentDoc.approval_date})}</Dialog.Title>
                    <Dialog.Actions>
                        <Button onPress={()=>{
                            setConsentDoc({});
                            setConsentVis(false);}}>
                                {t('general-settings.consented-ok')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            <AlertBar visible={dataPushedVis} setVisible={setDataPushedVis} messageKey="all data pushed!"></AlertBar>
            <AlertBar visible={userDataVis} setVisible={setUserDataVis} messageKey='general-settings.user-data-erased'></AlertBar>
            <AlertBar visible={invalidateSuccessVis} setVisible={setInvalidateSuccessVis} messageKey='success -> ' messageAddition={cacheResult}></AlertBar>
            <AlertBar visible={noConsentMessageVis} setVisible={setNoConsentMessageVis} messageKey='general-settings.no-consent-message'></AlertBar> 
        </>
    );
};
const styles = StyleSheet.create({
    dialog: (surfaceColor) => ({
        backgroundColor: surfaceColor,
        margin: 1,
    }),
    monoDesc: {
        fontSize: 12,
        fontFamily: "monospace",
    }
  });
   
  angularize(ProfileSettings, 'ProfileSettings', 'emission.main.control.profileSettings'); 
  export default ProfileSettings;
