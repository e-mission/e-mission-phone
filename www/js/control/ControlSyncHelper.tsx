import React, { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { Dialog, Button, Switch, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { settingStyles } from './ProfileSettings';
import ActionMenu from '../components/ActionMenu';
import SettingRow from './SettingRow';
import { AlertManager } from '../components/AlertBar';
import { addStatReading } from '../plugin/clientStats';
import { updateUser } from '../services/commHelper';
import { displayError, logDebug, logWarn } from '../plugin/logger';
import { DateTime } from 'luxon';

/*
 * BEGIN: Simple read/write wrappers
 */
export const forcePluginSync = () => window['cordova'].plugins.BEMServerSync.forceSync();
const setConfig = (config) => window['cordova'].plugins.BEMServerSync.setConfig(config);
const getConfig = () => window['cordova'].plugins.BEMServerSync.getConfig();

function formatConfigForDisplay(configToFormat) {
  const formatted: any[] = [];
  for (let prop in configToFormat) {
    formatted.push({ key: prop, val: configToFormat[prop] });
  }
  return formatted;
}

export async function getHelperSyncSettings() {
  let tempConfig = await getConfig();
  return formatConfigForDisplay(tempConfig);
}

type SyncConfig = { sync_interval: number; ios_use_remote_push: boolean };

//forceSync and endForceSync SettingRows & their actions
export const ForceSyncRow = ({ getState }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [dataPendingVis, setDataPendingVis] = useState(false);

  async function forceSync() {
    try {
      await addStatReading('force_sync');
      await forcePluginSync();
      /*
       * Change to sensorKey to "background/location" after fixing issues
       * with getLastSensorData and getLastMessages in the usercache
       * See https://github.com/e-mission/e-mission-phone/issues/279 for details
       */
      const sensorKey = 'statemachine/transition';
      let sensorDataList = await window['cordova'].plugins.BEMUserCache.getAllMessages(
        sensorKey,
        true,
      );

      // If everything has been pushed, we should
      // have no more trip end transitions left
      let isTripEnd = (entry) => entry.metadata == getEndTransitionKey();
      let syncLaunchedCalls = sensorDataList.filter(isTripEnd);
      let syncPending = syncLaunchedCalls.length > 0;
      logDebug(`sensorDataList.length = ${sensorDataList.length}, 
        syncLaunchedCalls.length = ${syncLaunchedCalls.length}, 
        syncPending? = ${syncPending}`);

      if (syncPending) {
        logDebug('data is pending, showing confirm dialog');
        setDataPendingVis(true); //consent handling in modal
      } else {
        AlertManager.addMessage({ text: 'all data pushed!' });
      }
    } catch (error) {
      displayError(error, 'Error while forcing sync');
    }
  }

  function getStartTransitionKey() {
    if (window['cordova'].platformId == 'android') {
      return 'local.transition.exited_geofence';
    } else if (window['cordova'].platformId == 'ios') {
      return 'T_EXITED_GEOFENCE';
    }
  }

  function getEndTransitionKey() {
    if (window['cordova'].platformId == 'android') {
      return 'local.transition.stopped_moving';
    } else if (window['cordova'].platformId == 'ios') {
      return 'T_TRIP_ENDED';
    }
  }

  function getOngoingTransitionState() {
    if (window['cordova'].platformId == 'android') {
      return 'local.state.ongoing_trip';
    } else if (window['cordova'].platformId == 'ios') {
      return 'STATE_ONGOING_TRIP';
    }
  }

  async function getTransition(transKey) {
    const entry_data = {};
    const curr_state = await getState();
    entry_data['curr_state'] = curr_state;
    if (transKey == getEndTransitionKey()) {
      entry_data['curr_state'] = getOngoingTransitionState();
    }
    entry_data['transition'] = transKey;
    entry_data['ts'] = DateTime.now().toSeconds();
    return entry_data;
  }

  async function endForceSync() {
    /* First, quickly start and end the trip. Let's listen to the promise
     * result for start so that we ensure ordering */
    const sensorKey = 'statemachine/transition';
    let entry_data = await getTransition(getStartTransitionKey());
    let messagePut = await window['cordova'].plugins.BEMUserCache.putMessage(sensorKey, entry_data);
    entry_data = await getTransition(getEndTransitionKey());
    messagePut = await window['cordova'].plugins.BEMUserCache.putMessage(sensorKey, entry_data);
    forceSync();
  }

  return (
    <>
      <SettingRow textKey="control.force-sync" iconName="sync" action={forceSync}></SettingRow>
      <SettingRow
        textKey="control.end-trip-sync"
        iconName="sync-alert"
        action={endForceSync}></SettingRow>

      {/* dataPending */}
      <Modal visible={dataPendingVis} onDismiss={() => setDataPendingVis(false)} transparent={true}>
        <Dialog
          visible={dataPendingVis}
          onDismiss={() => setDataPendingVis(false)}
          style={settingStyles.dialog(colors.elevation.level3)}>
          <Dialog.Title>{t('data pending for push')}</Dialog.Title>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setDataPendingVis(false);
                logWarn('user refused to re-sync');
              }}>
              {t('general-settings.cancel')}
            </Button>
            <Button
              onPress={() => {
                setDataPendingVis(false);
                forceSync();
              }}>
              {t('general-settings.confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>
    </>
  );
};

//UI for editing the sync config
const ControlSyncHelper = ({ editVis, setEditVis }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [localConfig, setLocalConfig] = useState<SyncConfig>();
  const [intervalVis, setIntervalVis] = useState<boolean>(false);

  /*
   * Functions to read and format values for display
   */
  async function getSyncSettings() {
    let tempConfig = await getConfig();
    setLocalConfig(tempConfig);
  }

  useEffect(() => {
    getSyncSettings();
  }, [editVis]);

  const syncIntervalActions = [
    { text: '1 min', value: 60 },
    { text: '10 min', value: 10 * 60 },
    { text: '30 min', value: 30 * 60 },
    { text: '1 hr', value: 60 * 60 },
  ];

  /*
   * Functions to edit and save values
   */
  async function saveAndReload() {
    logDebug('saveAndReload: new config = ' + JSON.stringify(localConfig));
    try {
      let set = setConfig(localConfig);
      //NOTE -- we need to make sure we update these settings in ProfileSettings :) -- getting rid of broadcast handling for migration!!
      updateUser({
        // TODO: worth thinking about where best to set this
        // Currently happens in native code. Now that we are switching
        // away from parse, we can store this from javascript here.
        // or continue to store from native
        // this is easier for people to see, but means that calls to
        // native, even through the javascript interface are not complete
        curr_sync_interval: (localConfig as SyncConfig).sync_interval,
      });
    } catch (err) {
      displayError(err, 'Error while setting sync config');
    }
  }
  function onChooseInterval(interval) {
    let tempConfig = { ...localConfig } as SyncConfig;
    tempConfig.sync_interval = interval.value;
    setLocalConfig(tempConfig);
  }

  function onTogglePush() {
    let tempConfig = { ...localConfig } as SyncConfig;
    tempConfig.ios_use_remote_push = !(localConfig as SyncConfig).ios_use_remote_push;
    setLocalConfig(tempConfig);
  }

  /*
   * configure the UI
   */
  let toggle;
  if (window['cordova'].platformId == 'ios') {
    toggle = (
      <View
        style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="labelMedium">Use Remote Push</Text>
        <Switch value={localConfig?.ios_use_remote_push} onValueChange={onTogglePush}></Switch>
      </View>
    );
  }

  return (
    <>
      {/* popup to show when we want to edit */}
      <Modal visible={editVis} onDismiss={() => setEditVis(false)} transparent={true}>
        <Dialog
          visible={editVis}
          onDismiss={() => setEditVis(false)}
          style={settingStyles.dialog(colors.elevation.level3)}>
          <Dialog.Title>Edit Sync Settings</Dialog.Title>
          <Dialog.Content>
            <View
              style={{
                paddingHorizontal: 15,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}>
              <Text variant="labelMedium">Sync Interval</Text>
              <Button onPress={() => setIntervalVis(true)}>{localConfig?.sync_interval}</Button>
            </View>
            {toggle}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                saveAndReload();
                setEditVis(false);
              }}>
              Save
            </Button>
            <Button onPress={() => setEditVis(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>

      <ActionMenu
        vis={intervalVis}
        setVis={setIntervalVis}
        title={'Select sync interval'}
        actionSet={syncIntervalActions}
        onAction={onChooseInterval}
        onExit={() => {}}></ActionMenu>
    </>
  );
};

export default ControlSyncHelper;
