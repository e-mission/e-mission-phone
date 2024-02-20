import { logWarn, logDebug } from '../plugin/logger';

export default function gatherBluetoothData(t): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let logs: string[] = [];
    logDebug('Running bluetooth discovery test!');

    window['bluetoothClassicSerial'].discoverUnpaired(
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
