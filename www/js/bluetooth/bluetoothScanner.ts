import { logWarn, logDebug, displayError } from '../plugin/logger';
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
    logDebug('Running bluetooth discovery test!');

    // Device List "I/O"
    function updatePairingStatus(pairingType: boolean, devices: Array<BluetoothClassicDevice>) {
      devices.forEach((device) => {
        device.is_paired = pairingType;
      });
      return devices;
    }

    // Plugin Calls
    const unpairedDevicesPromise = new Promise((res, rej) => {
      window['bluetoothClassicSerial'].discoverUnpaired(
        (devices: Array<BluetoothClassicDevice>) => {
          res(updatePairingStatus(false, devices));
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
          res(updatePairingStatus(true, devices));
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
