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
import EditConfigModal from './EditConfigModal';
import useAppConfig from '../useAppConfig';

type SyncConfig = { sync_interval: number; ios_use_remote_push: boolean };

/*
 * BEGIN: Simple read/write wrappers
 */
export const forcePluginSync = () => window['cordova'].plugins.BEMServerSync.forceSync();
const setConfig = (config) => window['cordova'].plugins.BEMServerSync.setConfig(config);
const getConfig = () => window['cordova'].plugins.BEMServerSync.getConfig();

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
  const appConfig = useAppConfig();
  const [localConfig, setLocalConfig] = useState<SyncConfig>();

  useEffect(() => {
    getConfig().then((config: SyncConfig) => setLocalConfig(config));
  }, [editVis]);

  const syncIntervalOptions = {
    '1 min': 1 * 60,
    '10 min': 10 * 60,
    '30 min': 30 * 60,
    '1 hr': 60 * 60,
  };

  async function saveAndReload() {
    logDebug('saveAndReload: new config = ' + JSON.stringify(localConfig));
    try {
      setConfig(localConfig);
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

  if (!localConfig) return null;

  return (
    <EditConfigModal
      editVis={editVis}
      setEditVis={setEditVis}
      titleKey="control.edit-sync-config"
      localConfig={localConfig}
      setLocalConfig={setLocalConfig}
      appConfigOverrides={appConfig?.sync}
      saveAndReload={saveAndReload}
      fieldsOptions={{
        sync_interval: syncIntervalOptions,
      }}
    />
  );
};

export default ControlSyncHelper;
