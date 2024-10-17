import React, { useState, useEffect, useContext, useRef } from 'react';
import { Modal, StyleSheet, ScrollView } from 'react-native';
import { Dialog, Button, useTheme, Text, Appbar, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import ExpansionSection from './ExpandMenu';
import SettingRow from './SettingRow';
import ControlDataTable from './ControlDataTable';
import DemographicsSettingRow from './DemographicsSettingRow';
import BluetoothScanSettingRow from './BluetoothScanSettingRow';
import PopOpCode from './PopOpCode';
import ReminderTime from './ReminderTime';
import useAppConfig from '../useAppConfig';
import { AlertManager } from '../components/AlertBar';
import DataDatePicker from './DataDatePicker';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import { sendLocalDBFile } from '../services/shareLocalDBFile';
import { uploadFile } from './uploadService';
import ActionMenu from '../components/ActionMenu';
import SensedPage from './SensedPage';
import LogPage from './LogPage';
import ControlSyncHelper, { ForceSyncRow, getHelperSyncSettings } from './ControlSyncHelper';
import ControlCollectionHelper, {
  getHelperCollectionSettings,
  getState,
  isMediumAccuracy,
  helperToggleLowAccuracy,
  forceTransition,
} from './ControlCollectionHelper';
import {
  _cacheResourcesFetchPromise,
  loadNewConfig,
  resetDataAndRefresh,
} from '../config/dynamicConfig';
import { AppContext } from '../App';
import { shareQR } from '../components/QrCode';
import { storageClear } from '../plugin/storage';
import { getAppVersion } from '../plugin/clientStats';
import { getConsentDocument } from '../splash/startprefs';
import { displayError, displayErrorMsg, logDebug, logWarn } from '../plugin/logger';
// import CustomLabelSettingRow from './CustomLabelSettingRow';
import { fetchOPCode, getSettings } from '../services/controlHelper';
import {
  updateScheduledNotifs,
  getScheduledNotifs,
  getReminderPrefs,
  setReminderPrefs,
} from '../splash/notifScheduler';
import { DateTime } from 'luxon';
import { AppConfig } from '../types/appConfigTypes';
import NavBar, { NavBarButton } from '../components/NavBar';

//any pure functions can go outside
const ProfileSettings = () => {
  // anything that mutates must go in --- depend on props or state...
  const { t } = useTranslation();
  const appConfig = useAppConfig();
  const { colors } = useTheme();
  const { setPermissionsPopupVis } = useContext(AppContext);

  const editCollectionConfig = () => setEditCollectionVis(true);
  const editSyncConfig = () => setEditSync(true);

  //states and variables used to control/create the settings
  const [opCodeVis, setOpCodeVis] = useState(false);
  const [nukeSetVis, setNukeVis] = useState(false);
  const [forceStateVis, setForceStateVis] = useState(false);
  const [logoutVis, setLogoutVis] = useState(false);
  const [noConsentVis, setNoConsentVis] = useState(false);
  const [consentVis, setConsentVis] = useState(false);
  const [dateDumpVis, setDateDumpVis] = useState(false);
  const [privacyVis, setPrivacyVis] = useState(false);
  const [uploadVis, setUploadVis] = useState(false);
  const [showingSensed, setShowingSensed] = useState(false);
  const [showingLog, setShowingLog] = useState(false);
  const [editSync, setEditSync] = useState(false);
  const [editCollectionVis, setEditCollectionVis] = useState(false);

  // const [collectConfig, setCollectConfig] = useState({});
  const [collectSettings, setCollectSettings] = useState<any>({});
  const [notificationSettings, setNotificationSettings] = useState<any>({});
  const [authSettings, setAuthSettings] = useState<any>({});
  const [syncSettings, setSyncSettings] = useState<any>({});
  const [cacheResult, setCacheResult] = useState('');
  const [connectSettings, setConnectSettings] = useState({});
  const [uiConfig, setUiConfig] = useState<AppConfig | undefined>(undefined);
  const [consentDoc, setConsentDoc] = useState<any>({});
  const [dumpDate, setDumpDate] = useState(new Date());
  const [uploadReason, setUploadReason] = useState('');
  const appVersion = useRef();

  const stateActions = [
    { text: 'Initialize', transition: 'INITIALIZE' },
    { text: 'Start trip', transition: 'EXITED_GEOFENCE' },
    { text: 'End trip', transition: 'STOPPED_MOVING' },
    { text: 'Visit ended', transition: 'VISIT_ENDED' },
    { text: 'Visit started', transition: 'VISIT_STARTED' },
    { text: 'Remote push', transition: 'RECEIVED_SILENT_PUSH' },
  ];

  // used for scheduling notifs
  let scheduledPromise = new Promise<void>((rs) => rs());
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    //added appConfig.name needed to be defined because appConfig was defined but empty
    if (appConfig && appConfig.name) {
      whenReady(appConfig);
    }
  }, [appConfig]);

  function refreshScreen() {
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
  }, [uiConfig]);

  function whenReady(newAppConfig: AppConfig) {
    const tempUiConfig = newAppConfig;

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

    if (tempUiConfig.reminderSchemes) {
      // Update the scheduled notifs
      updateScheduledNotifs(
        tempUiConfig.reminderSchemes,
        isScheduling,
        setIsScheduling,
        scheduledPromise,
      )
        .then(() => {
          logDebug('updated scheduled notifs');
        })
        .catch((err) => {
          displayErrorMsg('Error while updating scheduled notifs', err);
        });
    }

    setUiConfig(tempUiConfig);
    refreshScreen();
  }

  async function refreshCollectSettings() {
    logDebug('refreshCollectSettings: collectSettings = ' + JSON.stringify(collectSettings));
    const newCollectSettings: any = {};

    // // refresh collect plugin configuration
    const collectionPluginConfig = await getHelperCollectionSettings();
    newCollectSettings.config = collectionPluginConfig;

    const collectionPluginState = await getState();
    newCollectSettings.state = collectionPluginState;
    newCollectSettings.trackingOn =
      collectionPluginState != 'local.state.tracking_stopped' &&
      collectionPluginState != 'STATE_TRACKING_STOPPED';

    const isLowAccuracy = await isMediumAccuracy();
    if (typeof isLowAccuracy != 'undefined') {
      newCollectSettings.lowAccuracy = isLowAccuracy;
    }

    setCollectSettings(newCollectSettings);
  }

  //ensure ui table updated when editor closes
  useEffect(() => {
    if (editCollectionVis == false) {
      setTimeout(() => {
        logDebug('closed editor, time to refreshCollectSettings');
        refreshCollectSettings();
      }, 1000);
    }
  }, [editCollectionVis]);

  async function refreshNotificationSettings() {
    logDebug(`about to refreshNotificationSettings, 
      notificationSettings = ${JSON.stringify(notificationSettings)}`);
    const newNotificationSettings: any = {};

    if (uiConfig?.reminderSchemes) {
      let promiseList: Promise<any>[] = [];
      promiseList.push(
        getReminderPrefs(uiConfig.reminderSchemes, isScheduling, setIsScheduling, scheduledPromise),
      );
      promiseList.push(getScheduledNotifs(isScheduling, scheduledPromise));
      let resultList = await Promise.all(promiseList);
      const prefs = resultList[0];
      const scheduledNotifs = resultList[1];
      logDebug(`prefs - scheduled notifs: 
        ${JSON.stringify(prefs)}\n - \n${JSON.stringify(scheduledNotifs)}`);

      const m = DateTime.fromFormat(prefs.reminder_time_of_day, 'HH:mm');
      newNotificationSettings.prefReminderTimeVal = m.toJSDate();
      newNotificationSettings.prefReminderTime = m.toFormat('t');
      newNotificationSettings.prefReminderTimeOnLoad = prefs.reminder_time_of_day;
      newNotificationSettings.scheduledNotifs = scheduledNotifs;
    }

    logDebug(`notification settings before - after: 
      ${JSON.stringify(notificationSettings)} - ${JSON.stringify(newNotificationSettings)}`);
    setNotificationSettings(newNotificationSettings);
  }

  async function getSyncSettings() {
    const newSyncSettings: any = {};
    getHelperSyncSettings().then((showConfig) => {
      newSyncSettings.show_config = showConfig;
      setSyncSettings(newSyncSettings);
      logDebug('sync settings are: ' + JSON.stringify(syncSettings));
    });
  }

  //update sync settings in the table when close editor
  useEffect(() => {
    getSyncSettings();
  }, [editSync]);

  async function getConnectURL() {
    getSettings().then(
      (response) => {
        const newConnectSettings: any = {};
        logDebug('getConnectURL: got response.connectUrl = ' + response.connectUrl);
        newConnectSettings.url = response.connectUrl;
        setConnectSettings(newConnectSettings);
      },
      (error) => {
        displayError(error, 'While getting connect url');
      },
    );
  }

  async function getOPCode() {
    const newAuthSettings: any = {};
    const opcode = await fetchOPCode();
    if (opcode == null) {
      newAuthSettings.opcode = 'Not logged in';
    } else {
      newAuthSettings.opcode = opcode;
    }
    setAuthSettings(newAuthSettings);
  }

  //methods that control the settings
  function uploadLog() {
    if (uploadReason != '') {
      let reason = uploadReason;
      uploadFile('loggerDB', reason);
      setUploadVis(false);
    }
  }

  async function updatePrefReminderTime(storeNewVal = true, newTime) {
    if (!uiConfig?.reminderSchemes)
      return logWarn('In updatePrefReminderTime, no reminderSchemes yet, skipping');
    if (storeNewVal) {
      const dt = DateTime.fromJSDate(newTime);
      // store in HH:mm
      setReminderPrefs(
        { reminder_time_of_day: dt.toFormat('HH:mm') },
        uiConfig.reminderSchemes,
        isScheduling,
        setIsScheduling,
        scheduledPromise,
      ).then(() => {
        refreshNotificationSettings();
      });
    }
  }

  function dummyNotification() {
    window['cordova'].plugins.notification.local.addActions('dummy-actions', [
      { id: 'action', title: 'Yes' },
      { id: 'cancel', title: 'No' },
    ]);
    window['cordova'].plugins.notification.local.schedule({
      id: new Date().getTime(),
      title: 'Dummy Title',
      text: 'Dummy text',
      actions: 'dummy-actions',
      trigger: { at: new Date(new Date().getTime() + 5000) },
    });
  }

  async function userStartStopTracking() {
    const transitionToForce = collectSettings.trackingOn ? 'STOP_TRACKING' : 'START_TRACKING';
    await forceTransition(transitionToForce);
    refreshCollectSettings();
  }

  async function toggleLowAccuracy() {
    let toggle = await helperToggleLowAccuracy();
    setTimeout(() => {
      refreshCollectSettings();
    }, 1500);
  }

  async function refreshConfig() {
    AlertManager.addMessage({ text: t('control.refreshing-app-config') });
    const updated = await loadNewConfig(authSettings.opcode, appConfig?.version);
    if (updated) {
      // wait for resources to finish downloading before reloading
      _cacheResourcesFetchPromise
        .then(() => window.location.reload())
        .catch((error) => displayError(error, 'Failed to download a resource'));
    } else {
      AlertManager.addMessage({ text: t('control.already-up-to-date') });
    }
  }

  //Platform.OS returns "web" now, but could be used once it's fully a Native app
  //for now, use window.cordova.platformId

  function parseState(state) {
    logDebug(`parseState: state = ${state}; 
      platformId = ${window['cordova'].platformId}`);
    if (state) {
      if (window['cordova'].platformId == 'android') {
        logDebug('platform ANDROID; parsed state will be ' + state.substring(12));
        return state.substring(12);
      } else if (window['cordova'].platformId == 'ios') {
        logDebug('platform IOS; parsed state will be ' + state.substring(6));
        return state.substring(6);
      }
    }
  }

  async function invalidateCache() {
    window['cordova'].plugins.BEMUserCache.invalidateAllCache().then(
      (result) => {
        logDebug('invalidateCache: result = ' + JSON.stringify(result));
        AlertManager.addMessage({ text: `success -> ${result}` });
      },
      (error) => {
        displayError(error, 'while invalidating cache, error->');
      },
    );
  }

  //in ProfileSettings in DevZone (above two functions are helpers)
  async function checkConsent() {
    getConsentDocument().then(
      (resultDoc) => {
        setConsentDoc(resultDoc);
        logDebug(`In profile settings, consent doc found = ${JSON.stringify(resultDoc)}`);
        if (resultDoc == null) {
          setNoConsentVis(true);
        } else {
          setConsentVis(true);
        }
      },
      (error) => {
        displayError(error, 'Error reading consent document from cache');
      },
    );
  }

  const onSelectState = (stateObject) => {
    forceTransition(stateObject.transition);
  };

  //conditional creation of setting sections

  let logUploadSection;
  if (appConfig?.profile_controls?.support_upload) {
    logUploadSection = (
      <SettingRow
        textKey="control.upload-log"
        iconName="cloud"
        action={() => setUploadVis(true)}></SettingRow>
    );
  }

  let timePicker;
  let notifSchedule;
  if (appConfig?.reminderSchemes) {
    timePicker = (
      <ReminderTime
        rowText={'control.reminders-time-of-day'}
        timeVar={notificationSettings.prefReminderTime}
        defaultTime={notificationSettings.prefReminderTimeVal}
        updateFunc={updatePrefReminderTime}></ReminderTime>
    );
    notifSchedule = (
      <>
        <SettingRow
          textKey="control.upcoming-notifications"
          iconName="bell-check"
          action={() => {}}></SettingRow>
        <ControlDataTable controlData={notificationSettings.scheduledNotifs}></ControlDataTable>
      </>
    );
  }

  return (
    <>
      <NavBar elevated={true}>
        <Appbar.Content title={t('control.profile-tab')} />
        <NavBarButton icon="logout" iconSize={24} onPress={() => setLogoutVis(true)}>
          <Text>{t('control.log-out')}</Text>
        </NavBarButton>
      </NavBar>

      <ScrollView>
        <SettingRow
          textKey="control.view-qrc"
          iconName="grid"
          action={(e) => setOpCodeVis(true)}
          desc={authSettings.opcode}
          descStyle={settingStyles.monoDesc}></SettingRow>
        <DemographicsSettingRow></DemographicsSettingRow>
        {/* {appConfig?.survey_info?.['trip-labels'] == 'MULTILABEL' && <CustomLabelSettingRow />} */}
        <SettingRow
          textKey="control.view-privacy"
          iconName="eye"
          action={() => setPrivacyVis(true)}></SettingRow>
        {timePicker}
        <SettingRow
          textKey="control.tracking"
          action={userStartStopTracking}
          switchValue={collectSettings.trackingOn}></SettingRow>
        <SettingRow
          textKey="control.app-status"
          iconName="check"
          action={() => setPermissionsPopupVis(true)}></SettingRow>
        <SettingRow
          textKey="control.medium-accuracy"
          action={toggleLowAccuracy}
          switchValue={collectSettings.lowAccuracy}></SettingRow>
        <SettingRow
          textKey="control.download-json-dump"
          iconName="calendar"
          action={() => setDateDumpVis(true)}></SettingRow>
        {logUploadSection}
        <SettingRow
          textKey="control.share-log"
          iconName="email"
          action={() => sendLocalDBFile('loggerDB')}></SettingRow>
        <SettingRow
          textKey="control.refresh-app-config"
          desc={t('control.current-version', { version: appConfig?.version })}
          iconName="cog-refresh"
          action={refreshConfig}></SettingRow>
        <ExpansionSection sectionTitle="control.dev-zone">
          <BluetoothScanSettingRow />
          <SettingRow
            textKey="control.refresh"
            iconName="refresh"
            action={refreshScreen}></SettingRow>
          <SettingRow
            textKey="control.check-consent"
            iconName="check"
            action={checkConsent}></SettingRow>
          <ForceSyncRow getState={getState}></ForceSyncRow>
          <SettingRow
            textKey="control.dummy-notification"
            iconName="bell"
            action={dummyNotification}></SettingRow>
          {notifSchedule}
          <SettingRow
            textKey="control.invalidate-cached-docs"
            iconName="delete"
            action={invalidateCache}></SettingRow>
          <SettingRow
            textKey="control.nuke-all"
            iconName="delete-forever"
            action={() => setNukeVis(true)}></SettingRow>
          <SettingRow
            textKey={parseState(collectSettings.state)}
            iconName="pencil"
            action={() => setForceStateVis(true)}></SettingRow>
          <SettingRow
            textKey="control.check-log"
            iconName="arrow-expand-right"
            action={() => setShowingLog(true)}></SettingRow>
          <SettingRow
            textKey="control.check-sensed-data"
            iconName="arrow-expand-right"
            action={() => setShowingSensed(true)}></SettingRow>
          <SettingRow
            textKey="control.collection"
            iconName="pencil"
            action={editCollectionConfig}></SettingRow>
          <ControlDataTable controlData={collectSettings.config}></ControlDataTable>
          <SettingRow textKey="control.sync" iconName="pencil" action={editSyncConfig}></SettingRow>
          <ControlDataTable controlData={syncSettings.show_config}></ControlDataTable>
        </ExpansionSection>
        <SettingRow
          textKey="control.app-version"
          iconName="application"
          action={() => {}}
          desc={appVersion.current}></SettingRow>
      </ScrollView>

      {/* menu for "nuke data" */}
      <Modal visible={nukeSetVis} onDismiss={() => setNukeVis(false)} transparent={true}>
        <Dialog
          visible={nukeSetVis}
          onDismiss={() => setNukeVis(false)}
          style={settingStyles.dialog(colors.elevation.level3)}>
          <Dialog.Title>{t('general-settings.clear-data')}</Dialog.Title>
          <Dialog.Content>
            <Button
              onPress={() => {
                storageClear({ local: true });
                setNukeVis(false);
              }}>
              {t('general-settings.nuke-ui-state-only')}
            </Button>
            <Button
              onPress={() => {
                storageClear({ native: true });
                setNukeVis(false);
              }}>
              {t('general-settings.nuke-native-cache-only')}
            </Button>
            <Button
              onPress={() => {
                storageClear({ local: true, native: true });
                setNukeVis(false);
              }}>
              {t('general-settings.nuke-everything')}
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setNukeVis(false)}>{t('general-settings.cancel')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>

      {/* force state sheet */}
      <ActionMenu
        vis={forceStateVis}
        setVis={setForceStateVis}
        title={'Force State'}
        actionSet={stateActions}
        onAction={onSelectState}
        onExit={() => {}}></ActionMenu>

      {/* upload reason input */}
      <Modal visible={uploadVis} onDismiss={() => setUploadVis(false)} transparent={true}>
        <Dialog
          visible={uploadVis}
          onDismiss={() => setUploadVis(false)}
          style={settingStyles.dialog(colors.elevation.level3)}>
          <Dialog.Title>{t('upload-service.upload-database', { db: 'loggerDB' })}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Reason"
              value={uploadReason}
              onChangeText={(uploadReason) => setUploadReason(uploadReason)}
              placeholder={t('upload-service.please-fill-in-what-is-wrong')}></TextInput>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setUploadVis(false)}>{t('general-settings.cancel')}</Button>
            <Button onPress={() => uploadLog()}>Upload</Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>

      {/* opcode viewing popup */}
      <PopOpCode
        visibilityValue={opCodeVis}
        setVis={setOpCodeVis}
        token={authSettings.opcode}
        action={() => shareQR(authSettings.opcode)}></PopOpCode>

      {/* {view privacy} */}
      <PrivacyPolicyModal
        privacyVis={privacyVis}
        setPrivacyVis={setPrivacyVis}></PrivacyPolicyModal>

      {/* logout menu */}
      <Modal visible={logoutVis} onDismiss={() => setLogoutVis(false)} transparent={true}>
        <Dialog
          visible={logoutVis}
          onDismiss={() => setLogoutVis(false)}
          style={settingStyles.dialog(colors.elevation.level3)}>
          <Dialog.Title>{t('general-settings.are-you-sure')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('general-settings.log-out-warning')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutVis(false)}>{t('general-settings.cancel')}</Button>
            <Button
              onPress={() => {
                resetDataAndRefresh();
              }}>
              {t('general-settings.confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>

      {/* handle no consent */}
      <Modal visible={noConsentVis} onDismiss={() => setNoConsentVis(false)} transparent={true}>
        <Dialog
          visible={noConsentVis}
          onDismiss={() => setNoConsentVis(false)}
          style={settingStyles.dialog(colors.elevation.level3)}>
          <Dialog.Title>{t('general-settings.consent-not-found')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('general-settings.no-consent-logout')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setNoConsentVis(false);
              }}>
              {t('general-settings.consented-ok')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>

      {/* handle consent */}
      <Modal visible={consentVis} onDismiss={() => setConsentVis(false)} transparent={true}>
        <Dialog
          visible={consentVis}
          onDismiss={() => setConsentVis(false)}
          style={settingStyles.dialog(colors.elevation.level3)}>
          <Dialog.Title>
            {t('general-settings.consented-to', { approval_date: consentDoc.approval_date })}
          </Dialog.Title>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setConsentDoc({});
                setConsentVis(false);
              }}>
              {t('general-settings.consented-ok')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>

      <DataDatePicker
        date={dumpDate}
        setDate={setDumpDate}
        open={dateDumpVis}
        setOpen={setDateDumpVis}
        minDate={
          new Date(appConfig?.intro?.start_year, appConfig?.intro?.start_month - 1, 1)
        }></DataDatePicker>

      <SensedPage pageVis={showingSensed} setPageVis={setShowingSensed}></SensedPage>
      <LogPage pageVis={showingLog} setPageVis={setShowingLog}></LogPage>

      <ControlSyncHelper editVis={editSync} setEditVis={setEditSync}></ControlSyncHelper>
      <ControlCollectionHelper
        editVis={editCollectionVis}
        setEditVis={setEditCollectionVis}></ControlCollectionHelper>
    </>
  );
};
export const settingStyles = StyleSheet.create({
  dialog: (surfaceColor) => ({
    backgroundColor: surfaceColor,
    margin: 5,
    marginLeft: 25,
    marginRight: 25,
  }),
  monoDesc: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default ProfileSettings;
