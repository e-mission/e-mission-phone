import React, { useContext } from 'react';
import ExpansionSection from '../components/ExpandMenu';
import BluetoothScanSettingRow from './bluetooth/BluetoothScanSettingRow';
import SettingRow from '../components/SettingRow';
import NukeDataModal from './NukeDataModal';
import { Alerts } from '../../components/AlertArea';
import EditTrackingConfigModal, { forceTransition } from './EditTrackingConfigModal';
import SensedPage from './SensedPage';
import LogPage from './LogPage';
import EditSyncConfigModal, { ForceSyncRow } from './EditSyncConfigModal';
import { getConsentDocument } from '../../splash/startprefs';
import { displayError, logDebug } from '../../plugin/logger';
import { t } from 'i18next';
import { scheduleDebugLocalNotification } from '../../splash/pushNotifySettings';
import ActionMenu from '../../components/ActionMenu';
import { AppContext } from '../../App';
import { getScheduledNotifs } from '../../splash/notifScheduler';
import JsonList from '../components/JsonList';

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

async function checkConsent() {
  getConsentDocument().then(
    (consentDoc) => {
      logDebug(`In profile settings, consent doc found = ${JSON.stringify(consentDoc)}`);
      const text =
        consentDoc == null
          ? t('general-settings.no-consent-logout')
          : t('general-settings.consented-to', { approval_date: consentDoc.approval_date });
      Alerts.addMessage({ text });
    },
    (error) => {
      displayError(error, 'Error reading consent document from cache');
    },
  );
}

async function invalidateCache() {
  window['cordova'].plugins.BEMUserCache.invalidateAllCache().then(
    (result) => {
      logDebug('invalidateCache: result = ' + JSON.stringify(result));
      Alerts.addMessage({ text: `success -> ${result}` });
    },
    (error) => {
      displayError(error, 'while invalidating cache, error->');
    },
  );
}

const DeveloperZone = ({ collectionState, refreshState }) => {
  const { appConfig } = useContext(AppContext);

  return (
    <ExpansionSection sectionTitle="control.dev-zone">
      <BluetoothScanSettingRow />
      <SettingRow textKey="control.refresh" iconName="refresh" action={refreshState} />
      <SettingRow textKey="control.check-consent" iconName="check" action={checkConsent} />
      <ForceSyncRow />
      <SettingRow
        textKey="control.dummy-notification"
        iconName="bell"
        action={scheduleDebugLocalNotification}
      />
      {appConfig.reminderSchemes && (
        <SettingRow
          textKey="control.upcoming-notifications"
          iconName="bell-check"
          action={() => {
            getScheduledNotifs().then((notifs) => {
              Alerts.showPopup({
                title: 'control.upcoming-notifications',
                content: <JsonList data={notifs} />,
              });
            });
          }}
        />
      )}
      <SettingRow
        textKey="control.invalidate-cached-docs"
        iconName="delete"
        action={invalidateCache}
      />
      <SettingRow
        textKey="control.nuke-all"
        iconName="delete-forever"
        action={() => Alerts.showPopup(NukeDataModal)}
      />
      <SettingRow
        textKey={parseState(collectionState)}
        iconName="pencil"
        action={() =>
          Alerts.showPopup(ActionMenu, {
            title: 'Force State',
            actionSet: [
              { text: 'Initialize', transition: 'INITIALIZE' },
              { text: 'Start trip', transition: 'EXITED_GEOFENCE' },
              { text: 'End trip', transition: 'STOPPED_MOVING' },
              { text: 'Visit ended', transition: 'VISIT_ENDED' },
              { text: 'Visit started', transition: 'VISIT_STARTED' },
              { text: 'Remote push', transition: 'RECEIVED_SILENT_PUSH' },
            ],
            onAction: (a) => forceTransition(a.transition),
          })
        }
      />
      <SettingRow
        textKey="control.check-log"
        iconName="arrow-expand-right"
        action={() => Alerts.showPopup(LogPage)}
      />
      <SettingRow
        textKey="control.check-sensed-data"
        iconName="arrow-expand-right"
        action={() => Alerts.showPopup(SensedPage)}
      />
      <SettingRow
        textKey="control.edit-tracking-config"
        iconName="pencil"
        action={() =>
          Alerts.showPopup(EditTrackingConfigModal, {
            afterSave: refreshState,
          })
        }
      />
      <SettingRow
        textKey="control.edit-sync-config"
        iconName="pencil"
        action={() => Alerts.showPopup(EditSyncConfigModal)}
      />
    </ExpansionSection>
  );
};
export default DeveloperZone;
