import React, { useState } from 'react';
import SettingRow from './SettingRow';
import BluetoothScanPage from '../bluetooth/BluetoothScanPage';
import { displayError, displayErrorMsg, logDebug } from '../plugin/logger';
import { getConfig } from './ControlSyncHelper';

const BluetoothScanSettingRow = ({}) => {
  const [bluePageVisible, setBluePageVisible] = useState<boolean>(false);

  async function openPopover() {
    // TODO: Add logic to check for conifig here, or in settings

    // Get the config to determine if user is on Android or iOS
    let config = await getConfig();

    // Depending on user platform, handle requesting the permissions differently
    if (!config.ios_use_remote_push) {
      // Check and prompt for bluetooth scan permission
      logDebug('[BLUETOOTH] ANDROID');
      try {
        let response = await window['cordova'].plugins.BEMDataCollection.bluetoothScanPermissions();
        if (response == 'OK') setBluePageVisible(true);
      } catch (e) {
        displayError(e, 'Insufficient Permissions');
      }
    } else {
      logDebug('[BLUETOOTH] IOS');
      let response = await window['bluetoothClassicSerial'].initializeBluetooth();
      logDebug(response);
      setBluePageVisible(true);
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
