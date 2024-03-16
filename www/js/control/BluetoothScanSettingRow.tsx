import React, { useState } from 'react';
import SettingRow from './SettingRow';
import BluetoothScanPage from '../bluetooth/BluetoothScanPage';

const BluetoothScanSettingRow = ({}) => {
  const [bluePageVisible, setBluePageVisible] = useState<boolean>(false);

  async function openPopover() {
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
