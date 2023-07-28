import React, { useState, useEffect } from "react";
import { Modal, StyleSheet } from "react-native";
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
    const { settings, logOut, viewPrivacyPolicy, forceSync, openDatePicker,
        eraseUserData, refreshScreen, endForceSync, checkConsent, invalidateCache, showLog, showSensed,
        parseState, userDataSaved, userData, ui_config, overallAppStatus } = settingsScope;

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
    const [collectSettings, setCollectSettings] = useState({});
    const [notificationSettings, setNotificationSettings] = useState({});
    const [authSettings, setAuthSettings] = useState({});

    let carbonDatasetString = t('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();
    const carbonOptions = CarbonDatasetHelper.getCarbonDatasetOptions();
    const stateActions = [{text: "Initialize", transition: "INITIALIZE"},
    {text: 'Start trip', transition: "EXITED_GEOFENCE"},
    {text: 'End trip', transition: "STOPPED_MOVING"},
    {text: 'Visit ended', transition: "VISIT_ENDED"},
    {text: 'Visit started', transition: "VISIT_STARTED"},
    {text: 'Remote push', transition: "RECEIVED_SILENT_PUSH"}]

    useEffect(() => {
        if (appConfig) {
            refreshCollectSettings();
            refreshNotificationSettings();
            getOPCode();
        }
    }, [appConfig]);

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

        if (ui_config?.reminderSchemes) {
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
               <ControlDataTable controlData={settings?.sync?.show_config}></ControlDataTable>
               <SettingRow textKey="control.app-version" iconName="application" action={()=>console.log("")} desc={settings?.clientAppVer}></SettingRow>
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
