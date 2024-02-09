import React, { useState } from 'react';
import SettingRow from './SettingRow';
import BluetoothScanPage from '../bluetooth/BluetoothScanPage';

const BluetoothScanSettingRow = ({}) => {
  const [bluePageVisible, setBluePageVisible] = useState<boolean>(false);

  function openPopover() {
    // TODO: Add logic to check for conifig here, or in settings
    setBluePageVisible(true);
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
