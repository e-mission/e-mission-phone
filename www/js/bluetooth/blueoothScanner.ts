import { logDebug, displayError } from '../plugin/logger';
import { BluetoothClassicDevice } from '../types/bluetoothTypes';

/**
 * gatherBluetoothData scans for viewable Bluetooth Classic Devices
 * @param t is the i18next translation function
 * @returns an array of strings containing device data, formatted ['ID: id Name: name']
 */
export default function gatherBluetoothData(t): Promise<string[]> {
  return new Promise((resolve, reject) => {
    logDebug('Running bluetooth discovery test!');

    // Device List "I/O"
    function handleLogs(pairingType: Boolean, devices: Array<BluetoothClassicDevice>) {
      let logs: string[] = [];
      devices.forEach((device) => {
        device.is_paired;
      });
      return logs;
    }

    // Plugin Calls
    const unpairedDevicesPromise = new Promise((res, rej) => {
      window['bluetoothClassicSerial'].discoverUnpaired(
        (devices: Array<BluetoothClassicDevice>) => {
          res(handleLogs(false, devices));
        },
        (e: Error) => {
          displayError(e, 'Error');
          rej(e);
        },
      );
    });

    const pairedDevicesPromise = new Promise((res, rej) => {
      window['bluetoothClassicSerial'].list(
        (devices: Array<BluetoothClassicDevice>) => {
          res(handleLogs(true, devices));
        },
        (e: Error) => {
          displayError(e, 'Error');
          rej(e);
        },
      );
    });

    Promise.all([unpairedDevicesPromise, pairedDevicesPromise])
      .then((logs: Array<any>) => {
        resolve(logs.flat());
      })
      .catch((e) => {
        reject(e);
      });
  });
}
