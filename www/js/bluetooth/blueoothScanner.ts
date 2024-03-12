import { logWarn, logDebug } from '../plugin/logger';
import { BluetoothClassicDevice, BLEBeaconDevice } from '../types/BluetoothDevices';

const LouisTestBeacon = {
  identifier: 'Louis-Beacon',
  uuid: '426C7565-4368-6172-6D42-6561636F6E73',
  broadcast_type: 'iBeacon',
  major: '4949',
  minor: '3838',
};
const KatieTestBeacon: BLEBeaconDevice = {
  // System ID: 'DD:34:02:07:EC:04'
  identifier: 'BlueCharm_98105',
  uuid: '426C7565-4368-6172-6D42-6561636F6E73',
  broadcast_type: 'iBeacon',
  major: '4949',
  minor: '3838',
};

/**
 * gatherBluetoothData scans for viewable Bluetooth Classic Devices
 * @param t is the i18next translation function
 * @returns an array of strings containing device data, formatted ['ID: id Name: name']
 */
export function gatherBluetoothData(t): Promise<string[]> {
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

function createBLERegion(beaconData: BLEBeaconDevice) {
  // throws an error if the parameters are not valid
  return new window['locationManager'].BeaconRegion(
    beaconData.identifier,
    beaconData.uuid,
    beaconData.major,
    beaconData.minor,
  );
}

export function startBLEScanning() {
  const delegate = new window['locationManager'].Delegate();

  delegate.didDetermineStateForRegion = function (pluginResult) {
    logWarn('[DOM] didDetermineStateForRegion: ' + JSON.stringify(pluginResult));
    window['locationManager'].appendToDeviceLog(
      '[DOM] didDetermineStateForRegion: ' + JSON.stringify(pluginResult),
    );
  };

  delegate.didStartMonitoringForRegion = function (pluginResult) {
    logWarn('didStartMonitoringForRegion:' + JSON.stringify(pluginResult));
  };

  delegate.didRangeBeaconsInRegion = function (pluginResult) {
    logWarn('[DOM] didRangeBeaconsInRegion: ' + JSON.stringify(pluginResult));
  };

  window['locationManager'].setDelegate(delegate);
  window['locationManager'].requestWhenInUseAuthorization();

  const BeaconRegion = createBLERegion(KatieTestBeacon);

  window['locationManager']
    .startMonitoringForRegion(BeaconRegion)
    .fail(function (e) {
      logWarn(e);
    })
    .done();
}

export function endBLEScanning() {
  const beaconRegion = createBLERegion(KatieTestBeacon);

  window['locationManager']
    .stopMonitoringForRegion(beaconRegion)
    .fail(function (e) {
      console.error(e);
    })
    .done();
}
