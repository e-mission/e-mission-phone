import { logDebug } from '../plugin/logger';

export function gatherBluetoothData(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let logs: string[] = [];

    window['bluetoothSerial'].discoverUnpaired(
      (devices: Array<any>) => {
        logs.push('Successfully scanned, results...');
        devices.forEach(function (device) {
          logs.push('ID: ' + device.id + ' Name: ' + device.name);
        });
        resolve(logs);
      },
      (err: string) => {
        logs.push('Failed!');
        logs.push('ERROR: ' + err);
        logDebug('ERROR: ' + err);
        reject(new Error(err));
      },
    );
  });
}

export default gatherBluetoothData;
