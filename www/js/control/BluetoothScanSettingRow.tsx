import React, { useState } from 'react';
import SettingRow from './SettingRow';
import BluetoothScanPage from '../bluetooth/BluetoothScanPage';
import { displayError, displayErrorMsg } from '../plugin/logger';
import { getConfig } from './ControlSyncHelper';

const BluetoothScanSettingRow = ({}) => {
  const [bluePageVisible, setBluePageVisible] = useState<boolean>(false);

  async function openPopover() {
    // TODO: Add logic to check for conifig here, or in settings

    // Determine if user is on Android or iOS as this is an Android only feature right now
    let config = await getConfig();

    if (!config.ios_use_remote_push) {
      // Check and prompt for bluetooth scan permission
      try {
        let response = await window['cordova'].plugins.BEMDataCollection.bluetoothScanPermissions();
        if (response == 'OK') setBluePageVisible(true);
      } catch (e) {
        displayError(e, 'Insufficient Permissions');
      }
    } else {
      displayErrorMsg(
        'Scanning for bluetooth devices is currently only supported on Android, sorry!',
        'Platform Not Supported',
      );
    }
  }

  return (
    <>
      <SettingRow
        textKey="control.bluetooth-scan"
        iconName="bluetooth-settings"
        action={openPopover}></SettingRow>
      <BluetoothScanPage visible={bluePageVisible} onDismiss={() => setBluePageVisible(false)} />
    </>
  );
};

export default BluetoothScanSettingRow;
