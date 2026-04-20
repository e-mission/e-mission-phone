import React, { useContext, useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { Dialog, Button, useTheme, ModalProps } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { settingStyles } from '../ProfileSettings';
import SettingRow from '../components/SettingRow';
import { addStatReading } from '../../plugin/clientStats';
import { displayError, logDebug, logWarn } from '../../plugin/logger';
import { DateTime } from 'luxon';
import EditConfigModal from './EditConfigModal';
import useAppConfig from '../../useAppConfig';
import { AppContext } from '../../App';
import { Alerts } from '../../components/AlertArea';

type SyncConfig = { sync_interval: number; ios_use_remote_push: boolean };

/*
 * BEGIN: Simple read/write wrappers
 */
export const forcePluginSync = () => window['cordova'].plugins.BEMServerSync.forceSync();
const setConfig = (config) => window['cordova'].plugins.BEMServerSync.setConfig(config);
const getConfig = () => window['cordova'].plugins.BEMServerSync.getConfig();

//forceSync and endForceSync SettingRows & their actions
export const ForceSyncRow = () => {
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
        Alerts.addMessage({ text: 'all data pushed!' });
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
    const curr_state = await window['cordova'].plugins.BEMDataCollection.getState();
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
          <Dialog.Title>{'data pending for push'}</Dialog.Title>
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

type Props = ModalProps & {
  afterSave?: () => void;
};
const EditSyncConfigModal = ({ afterSave, ...props }: Props) => {
  const appConfig = useAppConfig();

  const { updateUserProfile } = useContext(AppContext);
  const [localConfig, setLocalConfig] = useState<SyncConfig>();

  useEffect(() => {
    getConfig().then((config: SyncConfig) => setLocalConfig(config));
  }, []);

  const syncIntervalOptions = {
    '1 min': 1 * 60,
    '10 min': 10 * 60,
    '30 min': 30 * 60,
    '1 hr': 60 * 60,
  };

  async function saveAndReload() {
    logDebug('saveAndReload: new config = ' + JSON.stringify(localConfig));
    if (!localConfig) return;
    try {
      await setConfig(localConfig);
      updateUserProfile({
        curr_sync_interval: localConfig.sync_interval,
      });
      afterSave?.();
    } catch (err) {
      displayError(err, 'Error while setting sync config');
    }
  }

  if (!localConfig) return null;

  return (
    <EditConfigModal
      titleKey="control.edit-sync-config"
      localConfig={localConfig}
      setLocalConfig={setLocalConfig}
      appConfigOverrides={appConfig?.sync}
      saveAndReload={saveAndReload}
      fieldsOptions={{
        sync_interval: syncIntervalOptions,
      }}
      {...props}
    />
  );
};

export default EditSyncConfigModal;
