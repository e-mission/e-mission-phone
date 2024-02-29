import { logWarn, logDebug } from '../plugin/logger';

// Device data, as defined in BluetoothClassicSerial's docs
type BluetoothClassicDevice = {
  class: number;
  id: string;
  address: string;
  name: string;
};

/**
 * gatherBluetoothData scans for viewable Bluetooth Classic Devices
 * @param t is the 18next translation function
 * @returns an array of strings containing device data, formatted ['ID: id Name: name']
 */
export default function gatherBluetoothData(t): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let logs: string[] = [];
    logDebug('Running bluetooth discovery test!');

    // Device List "I/O"
    function handleLogs(devices: Array<BluetoothClassicDevice>) {
      devices.forEach((device) => {
        logs.push(
          `${t('bluetooth.device-info.id')}: ${device.id} ${t('bluetooth.device-info.name')}: ${
            device.name
          }`,
        );
      });
    }

    function handleErr(errorText: string) {
      logs.push(t('errors.while-scanning-bluetooth'));
      logs.push('ERROR: ' + errorText);
      logWarn('ERROR: ' + errorText);
    }

    // Plugin Calls
    const unpairedDevicesPromise = new Promise((unpairedRes, unpairedRej) => {
      window['bluetoothClassicSerial'].discoverUnpaired(
        (devices: Array<BluetoothClassicDevice>) => {
          handleLogs(devices);
          unpairedRes(logs);
        },
        (err: string) => {
          handleErr(err);
          unpairedRej(new Error(err));
        },
      );
    });

    const pairedDevicesPromise = new Promise((pairRes, pairRej) => {
      window['bluetoothClassicSerial'].list(
        (devices: Array<BluetoothClassicDevice>) => {
          handleLogs(devices);
          pairRes(logs);
        },
        (err: string) => {
          handleErr(err);
          pairRej(new Error(err));
        },
      );

      Promise.all([unpairedDevicesPromise, pairedDevicesPromise])
        .then(() => {
          resolve(logs);
        })
        .catch((err) => {
          reject(err);
        });
    });
  });
}
