import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, Appbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { AppContext } from '../App';
import { displayError } from '../plugin/logger';
import { Alerts } from '../components/AlertBar';
import { shareQR } from '../components/QrCode';
import NavBar, { NavBarButton } from '../components/NavBar';
import { sendLocalDBFile } from '../services/shareLocalDBFile';
import { refreshConfig } from '../config/dynamicConfig';
import SettingRow from './components/SettingRow';
import JsonList from './components/JsonList';
import DemographicsSettingRow from './DemographicsSettingRow';
import ReminderTime from './ReminderTime';
import PopOpCode from './PopOpCode';
import DataDatePicker from './DataDatePicker';
import PrivacyPolicyModal from './PrivacyPolicyModal';
// import CustomLabelSettingRow from './CustomLabelSettingRow';
import LogoutModal from './LogoutModal';
import UploadLogModal from './UploadLogModal';
import DeveloperZone from './devzone/DeveloperZone';
import { forceTransition } from './devzone/EditTrackingConfigModal';

const ProfileSettings = () => {
  const { t } = useTranslation();
  const { appConfig, setPermissionsPopupVis, userProfile } = useContext(AppContext);

  const [collectionState, setCollectionState] = useState('');
  const [opcode, setOpcode] = useState('');
  const [appVersion, setAppVersion] = useState('');

  const collectionTrackingOn =
    collectionState != 'local.state.tracking_stopped' &&
    collectionState != 'STATE_TRACKING_STOPPED';

  useEffect(() => {
    refreshState();
  }, []);

  function refreshState() {
    window['cordova'].plugins.BEMDataCollection.getState().then((state) => {
      setCollectionState(state);
    });
    window['cordova'].plugins.OPCodeAuth.getOPCode().then((opcode) => {
      setOpcode(opcode);
    });
    window['cordova']?.getAppVersion.getVersionNumber().then((version) => {
      setAppVersion(version);
    });
  }

  return (
    <>
      <NavBar elevated={true}>
        <Appbar.Content title={t('control.profile-tab')} />
        <NavBarButton icon="logout" iconSize={24} onPress={() => Alerts.showPopup(LogoutModal)}>
          <Text>{t('control.log-out')}</Text>
        </NavBarButton>
      </NavBar>

      <ScrollView>
        <SettingRow
          textKey="control.view-qrc"
          iconName="grid"
          action={() =>
            Alerts.showPopup(PopOpCode, {
              token: opcode,
              onShare: () => shareQR(opcode),
            })
          }
          desc={opcode}
          descStyle={settingStyles.monoDesc}
        />
        <DemographicsSettingRow />
        {/* {appConfig?.survey_info?.['trip-labels'] == 'MULTILABEL' && <CustomLabelSettingRow />} */}
        <SettingRow
          textKey="control.view-privacy"
          iconName="eye"
          action={() => Alerts.showPopup(PrivacyPolicyModal)}
        />
        {appConfig.reminderSchemes && <ReminderTime />}
        <SettingRow
          textKey="control.tracking"
          action={() =>
            forceTransition(collectionTrackingOn ? 'STOP_TRACKING' : 'START_TRACKING').then(() => {
              refreshState();
            })
          }
          switchValue={collectionTrackingOn}
        />
        <SettingRow
          textKey="control.app-status"
          iconName="check"
          action={() => setPermissionsPopupVis(true)}
        />
        <SettingRow
          textKey="control.download-json-dump"
          iconName="calendar"
          action={() => Alerts.showPopup(DataDatePicker)}
        />
        {appConfig?.profile_controls?.support_upload && (
          <SettingRow
            textKey="control.upload-log"
            iconName="cloud"
            action={() => Alerts.showPopup(UploadLogModal)}
          />
        )}
        <SettingRow
          textKey="control.share-log"
          iconName="email"
          action={() => sendLocalDBFile('loggerDB')}
        />
        <SettingRow
          textKey="control.refresh-app-config"
          desc={t('control.current-version', { version: appConfig?.version })}
          iconName="cog-refresh"
          action={() => refreshConfig(opcode, appConfig.version)}
        />
        <SettingRow
          textKey="control.app-version"
          iconName="application"
          desc={appVersion}
          action={() =>
            Alerts.showPopup({
              title: 'User Profile Information',
              content: <JsonList data={userProfile} />,
            })
          }
        />
        <DeveloperZone collectionState={collectionState} refreshState={refreshState} />
      </ScrollView>
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
