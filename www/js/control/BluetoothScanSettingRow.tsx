import React, { useState } from 'react';
import SettingRow from './SettingRow';
import BluetoothScanPage from '../bluetooth/BluetoothScanPage';
import { displayError } from '../plugin/logger';

const BluetoothScanSettingRow = ({}) => {
  const [bluePageVisible, setBluePageVisible] = useState<boolean>(false);

  async function openPopover() {
    // TODO: Add logic to check for conifig here, or in settings

    // Check and prompt for bluetooth scan permission
    try {
      let response = await window['cordova'].plugins.BEMDataCollection.bluetoothScanPermissions();
      if (response == "OK") setBluePageVisible(true)
    } catch (e) {
      displayError(e, "Insufficient Permissions");
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
