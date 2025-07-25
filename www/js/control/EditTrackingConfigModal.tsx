import React, { useEffect, useState } from 'react';
import { displayError, logDebug } from '../plugin/logger';
import useAppConfig from '../useAppConfig';
import EditConfigModal from './EditConfigModal';

type TrackingConfig = {
  is_duty_cycling: boolean;
  simulate_user_interaction: boolean;
  accuracy: number;
  accuracy_threshold: number;
  filter_distance: number;
  filter_time: number;
  geofence_radius: number;
  ios_use_visit_notifications_for_detection: boolean;
  ios_use_remote_push_for_sync: boolean;
  android_geofence_responsiveness: number;
  is_fleet: boolean;
};

type AccuracyOptions = { [option: string]: number };

/*
 * Simple read/write wrappers
 */

export const getState = () => window['cordova'].plugins.BEMDataCollection.getState();
const setConfig = (config) => window['cordova'].plugins.BEMDataCollection.setConfig(config);
const getConfig = () => window['cordova'].plugins.BEMDataCollection.getConfig();
const getAccuracyOptions = () => window['cordova'].plugins.BEMDataCollection.getAccuracyOptions();

export async function forceTransition(transition) {
  try {
    let result = await window['cordova'].plugins.BEMDataCollection.forceTransition(transition);
    window.alert('success -> ' + result);
  } catch (err) {
    window.alert('error -> ' + err);
    displayError(err, 'error forcing state');
  }
}

const EditTrackingConfigModal = ({ editVis, setEditVis }) => {
  const appConfig = useAppConfig();

  const [localConfig, setLocalConfig] = useState<TrackingConfig>();
  const [accuracyOptions, setAccuracyOptions] = useState<AccuracyOptions>();

  useEffect(() => {
    Promise.all([getConfig(), getAccuracyOptions()]).then(([cfg, opts]) => {
      setLocalConfig(cfg);
      setAccuracyOptions(opts);
    });
  }, [editVis]);

  async function saveAndReload() {
    logDebug('new config = ' + JSON.stringify(localConfig));
    try {
      await setConfig(localConfig);
      setEditVis(false);
    } catch (err) {
      displayError(err, 'Error while setting collection config');
    }
  }

  if (!localConfig) return null;

  return (
    <EditConfigModal
      editVis={editVis}
      setEditVis={setEditVis}
      titleKey="control.edit-tracking-config"
      localConfig={localConfig}
      setLocalConfig={setLocalConfig}
      appConfigOverrides={appConfig?.tracking}
      saveAndReload={saveAndReload}
      fieldsOptions={
        accuracyOptions && {
          accuracy: accuracyOptions,
        }
      }
    />
  );
};

export default EditTrackingConfigModal;
