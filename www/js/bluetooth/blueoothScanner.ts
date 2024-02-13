import { logWarn } from '../plugin/logger';
import { useTranslation } from 'react-i18next';

export function gatherBluetoothData(): Promise<string[]> {
  const { t } = useTranslation();

  return new Promise((resolve, reject) => {
    let logs: string[] = [];

    window['bluetoothSerial'].discoverUnpaired(
      (devices: Array<any>) => {
        devices.forEach(function (device) {
          logs.push(
            `${t('bluetooth.device-info.id')}: ${device.id} ${t('bluetooth.device-info.name')}: ${
              device.name
            }`,
          );
        });
        resolve(logs);
      },
      (err: string) => {
        logs.push(t('errors.while-scanning-bluetooth'));
        logs.push('ERROR: ' + err);
        logWarn('ERROR: ' + err);
        reject(new Error(err));
      },
    );
  });
}

export default gatherBluetoothData;
