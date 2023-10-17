import React, { useState, useEffect, useContext, useRef } from "react";
import { Modal, StyleSheet, ScrollView } from "react-native";
import { Dialog, Button, useTheme, Text, Appbar, IconButton } from "react-native-paper";
import { getAngularService } from "../angular-react-helper";
import { useTranslation } from "react-i18next";
import ExpansionSection from "./ExpandMenu";
import SettingRow from "./SettingRow";
import ControlDataTable from "./ControlDataTable";
import DemographicsSettingRow from "./DemographicsSettingRow";
import PopOpCode from "./PopOpCode";
import ReminderTime from "./ReminderTime"
import useAppConfig from "../useAppConfig";
import AlertBar from "./AlertBar";
import DataDatePicker from "./DataDatePicker";
import AppStatusModal from "./AppStatusModal";
import PrivacyPolicyModal from "./PrivacyPolicyModal";
import ActionMenu from "../components/ActionMenu";
import SensedPage from "./SensedPage"
import LogPage from "./LogPage";
import ControlSyncHelper, {ForceSyncRow, getHelperSyncSettings} from "./ControlSyncHelper";
import ControlCollectionHelper, {getHelperCollectionSettings, getState, isMediumAccuracy, helperToggleLowAccuracy, forceTransition} from "./ControlCollectionHelper";
import { resetDataAndRefresh } from "../config/dynamicConfig";
import { AppContext } from "../App";
import { shareQR } from "../components/QrCode";
import { storageClear } from "../plugin/storage";
import { getAppVersion } from "../plugin/clientStats";

//any pure functions can go outside
const ProfileSettings = () => {
    // anything that mutates must go in --- depend on props or state... 
    const { t } = useTranslation();
    const appConfig = useAppConfig();
    const { colors } = useTheme();
    const { setPermissionsPopupVis } = useContext(AppContext);

    //angular services needed
    const CarbonDatasetHelper = getAngularService('CarbonDatasetHelper');
    const UploadHelper = getAngularService('UploadHelper');
    const EmailHelper = getAngularService('EmailHelper');
    const NotificationScheduler = getAngularService('NotificationScheduler');
    const ControlHelper = getAngularService('ControlHelper');
    const StartPrefs = getAngularService('StartPrefs');

    //functions that come directly from an Angular service
    const editCollectionConfig = () => setEditCollection(true);
    const editSyncConfig = () => setEditSync(true);

    //states and variables used to control/create the settings
    const [opCodeVis, setOpCodeVis] = useState(false);
    const [nukeSetVis, setNukeVis] = useState(false);
    const [carbonDataVis, setCarbonDataVis] = useState(false);
    const [forceStateVis, setForceStateVis] = useState(false);
    const [logoutVis, setLogoutVis] = useState(false);
    const [invalidateSuccessVis, setInvalidateSuccessVis] = useState(false);
    const [noConsentVis, setNoConsentVis] = useState(false);
    const [noConsentMessageVis, setNoConsentMessageVis] = useState(false);
    const [consentVis, setConsentVis] = useState(false);
    const [dateDumpVis, setDateDumpVis] = useState(false);
    const [privacyVis, setPrivacyVis] = useState(false);
    const [showingSensed, setShowingSensed] = useState(false);
    const [showingLog, setShowingLog] = useState(false);
    const [editSync, setEditSync] = useState(false);
    const [editCollection, setEditCollection] = useState(false);

    // const [collectConfig, setCollectConfig] = useState({});
    const [collectSettings, setCollectSettings] = useState({});
    const [notificationSettings, setNotificationSettings] = useState({});
    const [authSettings, setAuthSettings] = useState({});
    const [syncSettings, setSyncSettings] = useState({});
    const [cacheResult, setCacheResult] = useState("");
    const [connectSettings, setConnectSettings] = useState({});
    const [uiConfig, setUiConfig] = useState({});
    const [consentDoc, setConsentDoc] = useState({});
    const [dumpDate, setDumpDate] = useState(new Date());
    const appVersion = useRef();

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
        getSyncSettings();
        getConnectURL();
        getAppVersion().then((version) => {
            appVersion.current = version;
        });
    }

    //previously not loaded on regular refresh, this ensures it stays caught up
    useEffect(() => {
        refreshNotificationSettings();
    }, [uiConfig])

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

        // // refresh collect plugin configuration
        const collectionPluginConfig = await getHelperCollectionSettings();
        newCollectSettings.config = collectionPluginConfig;
        
        const collectionPluginState = await getState();
        newCollectSettings.state = collectionPluginState;
        newCollectSettings.trackingOn = collectionPluginState != "local.state.tracking_stopped"
                                        && collectionPluginState != "STATE_TRACKING_STOPPED";

        const isLowAccuracy = await isMediumAccuracy();
        if (typeof isLowAccuracy != 'undefined') {
            newCollectSettings.lowAccuracy = isLowAccuracy;
        }

        setCollectSettings(newCollectSettings);
    }

    //ensure ui table updated when editor closes
    useEffect(() => {
        refreshCollectSettings();
    }, [editCollection])

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

    async function getSyncSettings() {
        console.log("getting sync settings");
        var newSyncSettings = {};
        getHelperSyncSettings().then(function(showConfig) {
            newSyncSettings.show_config = showConfig;
            setSyncSettings(newSyncSettings);
            console.log("sync settings are ", syncSettings);
        });
    };

    //update sync settings in the table when close editor
    useEffect(() => {
        getSyncSettings();
    }, [editSync]);

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
        forceTransition(transitionToForce);
        refreshCollectSettings();
    }

    async function toggleLowAccuracy() {
        let toggle = await helperToggleLowAccuracy();
        refreshCollectSettings();
    }

    const viewQRCode = function(e) {
        setOpCodeVis(true);
    }
    
    const clearNotifications = function() {
        window.cordova.plugins.notification.local.clearAll();
    }

    //Platform.OS returns "web" now, but could be used once it's fully a Native app
    //for now, use window.cordova.platformId

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

    const onSelectState = function(stateObject) {
        forceTransition(stateObject.transition); 
    }

    const onSelectCarbon = function(carbonObject) {
        console.log("changeCarbonDataset(): chose locale " + carbonObject.value);
        CarbonDatasetHelper.saveCurrentCarbonDatasetLocale(carbonObject.value); //there's some sort of error here
        //Unhandled Promise Rejection: While logging, error -[NSNull UTF8String]: unrecognized selector sent to instance 0x7fff8a625fb0
        carbonDatasetString = i18next.t('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();
    }

    //conditional creation of setting sections

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
        <Appbar.Header statusBarHeight={0} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
            <Appbar.Content title={t("control.profile-tab")} />
            <Text>{t('control.log-out')}</Text>
            <IconButton icon="logout" onPress={() => setLogoutVis(true)}></IconButton>
        </Appbar.Header>
        
        <ScrollView>
            <SettingRow textKey="control.view-qrc" iconName="grid" action={viewQRCode} desc={authSettings.opcode} descStyle={settingStyles.monoDesc}></SettingRow>
            <DemographicsSettingRow></DemographicsSettingRow>
            <SettingRow textKey='control.view-privacy' iconName='eye' action={() => setPrivacyVis(true)}></SettingRow>
            {timePicker}
            <SettingRow textKey="control.tracking" action={userStartStopTracking} switchValue={collectSettings.trackingOn}></SettingRow>
            <SettingRow textKey="control.app-status" iconName="check" action={() => setPermissionsPopupVis(true)}></SettingRow>
            <SettingRow textKey="control.medium-accuracy" action={toggleLowAccuracy} switchValue={collectSettings.lowAccuracy}></SettingRow>
            <SettingRow textKey={carbonDatasetString} iconName="database-cog" action={() => setCarbonDataVis(true)}></SettingRow>
            <SettingRow textKey="control.download-json-dump" iconName="calendar" action={()=>setDateDumpVis(true)}></SettingRow>
            {logUploadSection}
            <SettingRow textKey="control.email-log" iconName="email" action={emailLog}></SettingRow>
           
            <ExpansionSection sectionTitle="control.dev-zone">
                <SettingRow textKey="control.refresh" iconName="refresh" action={refreshScreen}></SettingRow>
                <SettingRow textKey="control.check-consent" iconName="check" action={checkConsent}></SettingRow>
                <ForceSyncRow getState={getState}></ForceSyncRow>
                <SettingRow textKey="control.dummy-notification" iconName="bell" action={dummyNotification}></SettingRow>
                {notifSchedule}
                <SettingRow textKey="control.invalidate-cached-docs" iconName="delete" action={invalidateCache}></SettingRow>
                <SettingRow textKey="control.nuke-all" iconName="delete-forever" action={() => setNukeVis(true)}></SettingRow>
                <SettingRow textKey={parseState(collectSettings.state)} iconName="pencil" action={() => setForceStateVis(true)}></SettingRow>
                <SettingRow textKey="control.check-log" iconName="arrow-expand-right" action={() => setShowingLog(true)}></SettingRow>
                <SettingRow textKey="control.check-sensed-data" iconName="arrow-expand-right" action={() => setShowingSensed(true)}></SettingRow>
                <SettingRow textKey="control.collection" iconName="pencil" action={editCollectionConfig}></SettingRow>
                <ControlDataTable controlData={collectSettings.config}></ControlDataTable>
                <SettingRow textKey="control.sync" iconName="pencil" action={editSyncConfig}></SettingRow>
                <ControlDataTable controlData={syncSettings.show_config}></ControlDataTable>
            </ExpansionSection>
            <SettingRow textKey="control.app-version" iconName="application" action={()=>console.log("")} desc={appVersion.current}></SettingRow>
        </ScrollView>

            {/* menu for "nuke data" */}
            <Modal visible={nukeSetVis} onDismiss={() => setNukeVis(false)}
            transparent={true}>
                <Dialog visible={nukeSetVis}
                onDismiss={() => setNukeVis(false)}
                style={settingStyles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{t('general-settings.clear-data')}</Dialog.Title>
                    <Dialog.Content>
                        <Button onPress={() => {storageClear({local: true})
                                                setNukeVis(false);}}>
                            {t('general-settings.nuke-ui-state-only')}
                        </Button>
                        <Button onPress={() => {storageClear({native: true});
                                                setNukeVis(false);}}>
                            {t('general-settings.nuke-native-cache-only')}
                        </Button>
                        <Button onPress={() => {storageClear({local: true, native: true});
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
            <ActionMenu vis={carbonDataVis} setVis={setCarbonDataVis} title={t('general-settings.choose-dataset')} actionSet={carbonOptions} onAction={onSelectCarbon} onExit={() => clearNotifications()}></ActionMenu>

            {/* force state sheet */}
            <ActionMenu vis={forceStateVis} setVis={setForceStateVis} title={"Force State"} actionSet={stateActions} onAction={onSelectState} onExit={() => {}}></ActionMenu>

            {/* opcode viewing popup */}
            <PopOpCode visibilityValue = {opCodeVis} setVis = {setOpCodeVis} tokenURL = {"emission://login_token?token="+authSettings.opcode} action={() => shareQR(authSettings.opcode)}></PopOpCode>

            {/* {view privacy} */}
            <PrivacyPolicyModal privacyVis={privacyVis} setPrivacyVis={setPrivacyVis}></PrivacyPolicyModal>
            
            {/* logout menu */}
            <Modal visible={logoutVis} onDismiss={() => setLogoutVis(false)} transparent={true}>
                <Dialog visible={logoutVis} 
                        onDismiss={() => setLogoutVis(false)} 
                        style={settingStyles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{t('general-settings.are-you-sure')}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="">{t('general-settings.log-out-warning')}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={()=>setLogoutVis(false)}>
                            {t('general-settings.cancel')}
                        </Button>
                        <Button onPress={() => {
                           resetDataAndRefresh();
                        }}>
                            {t('general-settings.confirm')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            {/* handle no consent */}
            <Modal visible={noConsentVis} onDismiss={()=>setNoConsentVis(false)} transparent={true}>
                <Dialog visible={noConsentVis} 
                        onDismiss={()=>setNoConsentVis(false)} 
                        style={settingStyles.dialog(colors.elevation.level3)}>
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
                        style={settingStyles.dialog(colors.elevation.level3)}>
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

            <DataDatePicker date={dumpDate} setDate={setDumpDate} open={dateDumpVis} setOpen={setDateDumpVis} 
                minDate={new Date(appConfig?.intro?.start_year, appConfig?.intro?.start_month - 1, 1)}>
            </DataDatePicker>

            <AlertBar visible={invalidateSuccessVis} setVisible={setInvalidateSuccessVis} messageKey='success -> ' messageAddition={cacheResult}></AlertBar>
            <AlertBar visible={noConsentMessageVis} setVisible={setNoConsentMessageVis} messageKey='general-settings.no-consent-message'></AlertBar> 

            <SensedPage pageVis={showingSensed} setPageVis={setShowingSensed}></SensedPage>
            <LogPage pageVis={showingLog} setPageVis={setShowingLog}></LogPage>

            <ControlSyncHelper editVis={editSync} setEditVis={setEditSync}></ControlSyncHelper>
            <ControlCollectionHelper editVis={editCollection} setEditVis={setEditCollection}></ControlCollectionHelper>
        
        </>
    );
};
export const settingStyles = StyleSheet.create({
    dialog: (surfaceColor) => ({
        backgroundColor: surfaceColor,
        margin: 5,
        marginLeft: 25,
        marginRight: 25
    }),
    monoDesc: {
        fontSize: 12,
        fontFamily: "monospace",
    }
  });
   
  export default ProfileSettings;
