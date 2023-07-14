import React, { useState, useEffect } from "react";
import { Platform, Modal } from "react-native";
import { Dialog, Button } from "react-native-paper";
import { angularize, getAngularService } from "../angular-react-helper";
import { object } from "prop-types";
import { useTranslation } from "react-i18next";
import ExpansionSection from "./ExpandMenu";
import SettingRow from "./SettingRow";
import ControlDataTable from "./ControlDataTable";
import DemographicsSettingRow from "./DemographicsSettingRow";
import PopOpCode from "./PopOpCode";
import useAppConfig from "../useAppConfig";

let controlUpdateCompleteListenerRegistered = false;

//any pure functions can go outside
const ProfileSettings = () => {
    // anything that mutates must go in --- depend on props or state... 
    const { t } = useTranslation();
    const { appConfig, loading } = useAppConfig();

    // get the scope of the general-settings.js file
    const mainMetricsEl = document.getElementById('main-control').querySelector('ion-view');
    const settingsScope = angular.element(mainMetricsEl).scope();
    // grab any variables or functions we need from it like this:
    const { settings, logOut, viewPrivacyPolicy,
        fixAppStatus, forceSync, openDatePicker,
        eraseUserData, refreshScreen, endForceSync, checkConsent, 
        dummyNotification, invalidateCache, showLog, showSensed,
        parseState } = settingsScope;

    //angular services needed
    const CarbonDatasetHelper = getAngularService('CarbonDatasetHelper');
    const UploadHelper = getAngularService('UploadHelper');
    const EmailHelper = getAngularService('EmailHelper');
    const ControlCollectionHelper = getAngularService('ControlCollectionHelper');
    const ControlSyncHelper = getAngularService('ControlSyncHelper');
    const CalorieCal = getAngularService('CalorieCal');
    const KVStore = getAngularService('KVStore');

    if (!controlUpdateCompleteListenerRegistered) {
        settingsScope.$on('control.update.complete', function() {
            console.debug("Received control.update.complete event, refreshing screen");
            refreshScreen();
            refreshCollectSettings();
        });
        controlUpdateCompleteListenerRegistered = true;
    }

    //functions that come directly from an Angular service
    const forceState = ControlCollectionHelper.forceState;
    const editCollectionConfig = ControlCollectionHelper.editConfig;
    const editSyncConfig = ControlSyncHelper.editConfig;

    //states and variables used to control/create the settings
    const [opCodeVis, setOpCodeVis] = useState(false);
    const [nukeSetVis, setNukeVis] = useState(false);
    const [carbonDataVis, setCarbonDataVis] = useState(false);
    const [collectSettings, setCollectSettings] = useState({});
    let carbonDatasetString = t('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();
    const carbonOptions = CarbonDatasetHelper.getCarbonDatasetOptions();

    useEffect(() => {
        if (appConfig) {
            refreshCollectSettings();
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
    
    //methods that control the settings
    const uploadLog = function () {
        UploadHelper.uploadFile("loggerDB")
    };

    const emailLog = function () {
        // Passing true, we want to send logs
        EmailHelper.sendEmail("loggerDB")
    };

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

    var userData = [];
    var rawUserData;
    const shareQR = function() {
        var prepopulateQRMessage = {};  
        const c = document.getElementsByClassName('qrcode-link');
        const cbase64 = c[0].getAttribute('href');
        prepopulateQRMessage.files = [cbase64];
        prepopulateQRMessage.url = $scope.settings.auth.opcode;

        window.plugins.socialsharing.shareWithOptions(prepopulateQRMessage, function(result) {
            console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
            console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
        }, function(msg) {
            console.log("Sharing failed with message: " + msg);
        });
    }

    const viewQRCode = function(e) {
        // tokenURL = "emission://login_token?token="+settings.auth.opcode;
        setOpCodeVis(true);
    }

    const getUserData = function() {
        return CalorieCal.get().then(function(userDataFromStorage) {
            rawUserData = userDataFromStorage;
            if(userDataSaved()) {
                userData = []
                var height = userDataFromStorage.height.toString();
                var weight = userDataFromStorage.weight.toString();
                var temp  =  {
                    age: userDataFromStorage.age,
                    height: height + (userDataFromStorage.heightUnit == 1? ' cm' : ' ft'),
                    weight: weight + (userDataFromStorage.weightUnit == 1? ' kg' : ' lb'),
                    gender: userDataFromStorage.gender == 1? t('gender-male') : t('gender-female')
                }
                for (var i in temp) {
                    userData.push({key: i, val: temp[i]}); //changed from value to val! watch for rammifications!
                }
            }
        });
    }
    const userDataSaved = function() {
        console.log(rawUserData);
        var defined;
        if(rawUserData){
            defined = true;
        }
        else{
            defined = false;
        }
        if (defined && rawUserData != null) {
            return rawUserData.userDataSaved;
        } else{
            return false;
        }
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

    //conditional creation of the user dropdown
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

    return (
        <>
           <SettingRow textKey="control.profile" iconName='logout' action={logOut} desc={settings?.auth?.opcode}></SettingRow>
           <DemographicsSettingRow></DemographicsSettingRow>
           <SettingRow textKey='control.view-privacy' iconName='eye' action={viewPrivacyPolicy}></SettingRow>
           <SettingRow textKey="control.view-qrc" iconName="grid" action={viewQRCode}></SettingRow>
           <SettingRow textKey="control.tracking" action={userStartStopTracking} switchValue={collectSettings.trackingOn}></SettingRow>
           <SettingRow textKey="control.app-status" iconName="check" action={fixAppStatus}></SettingRow>
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
               {/* upcoming notifications seem to be undefined at time of render :( */}
               <SettingRow textKey="control.upcoming-notifications" iconName="bell-check" action={()=>console.log("")}></SettingRow>
               <ControlDataTable controlData={settings?.notification?.scheduledNotifs}></ControlDataTable>
               <SettingRow textKey="control.invalidate-cached-docs" iconName="delete" action={invalidateCache}></SettingRow>
               <SettingRow textKey="control.nuke-all" iconName="delete-forever" action={() => setNukeVis(true)}></SettingRow>
               <SettingRow textKey={parseState(collectSettings.state)} iconName="pencil" action={forceState}></SettingRow>
               <SettingRow textKey="control.check-log" iconName="arrow-expand-right" action={showLog}></SettingRow>
               <SettingRow textKey="control.check-sensed-data" iconName="arrow-expand-right" action={showSensed}></SettingRow>
               <SettingRow textKey="control.collection" iconName="pencil" action={editCollectionConfig}></SettingRow>
               <ControlDataTable controlData={collectSettings.config}></ControlDataTable>
               <SettingRow textKey="control.sync" iconName="pencil" action={editSyncConfig}></SettingRow>
               <ControlDataTable controlData={settings?.sync?.show_config}></ControlDataTable>
               <SettingRow textKey="control.app-version" iconName="application" action={()=>console.log("")} desc={settings?.clientAppVer}></SettingRow>
           </ExpansionSection>

        {/* menu for "nuke data"  -- elevation not really working?? */}
            <Modal visible={nukeSetVis} onDismiss={() => setNukeVis(false)}
            elevated={true}
            transparent={true}
            style={{ elevation: 3 }}>
                <Dialog visible={nukeSetVis}
                onDismiss={() => setNukeVis(false)}>
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
                elevated={true}
                style={{ elevation: 3 }}
                transparent={true}>
                <Dialog visible={carbonDataVis}
                    onDismiss={() => setCarbonDataVis(false)}>
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
                        <Button onPress={() => setCarbonDataVis(false)}>{t('general-settings.cancel')}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            <PopOpCode visibilityValue = {opCodeVis} setVis = {setOpCodeVis} tokenURL = {"emission://login_token?token="+settings?.auth?.opcode} action={shareQR}></PopOpCode>
        </>
    );
};
   
  angularize(ProfileSettings, 'ProfileSettings', 'emission.main.control.profileSettings'); 
  export default ProfileSettings;
