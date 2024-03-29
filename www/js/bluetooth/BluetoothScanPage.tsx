import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Modal, ScrollView, SafeAreaView, View, Text } from 'react-native';
import { gatherBluetoothClassicData } from './bluetoothScanner';
import { logWarn, displayError, displayErrorMsg, logDebug } from '../plugin/logger';
import BluetoothCard from './BluetoothCard';
import { Appbar, useTheme, TextInput, Button } from 'react-native-paper';
import {
  BLEBeaconDevice,
  BLEPluginCallback,
  BluetoothClassicDevice,
  BLEDeviceList,
} from '../types/bluetoothDevices';

/**
 * The implementation of this scanner page follows the design of
 * `www/js/survey/enketo/EnketoModal.tsx`!
 *
 * Future work may include refractoring these files to be implementations of a
 * single base "pop-up page" component
 */

const BluetoothScanPage = ({ ...props }: any) => {
  const STATIC_ID = 'edu.berkeley.eecs.emission';

  const { t } = useTranslation();
  const [bluetoothClassicList, setBluetoothClassicList] = useState<BluetoothClassicDevice[]>([]);
  const [sampleBLEDevices, setSampleBLEDevices] = useState<BLEDeviceList>({
    '426C7565-4368-6172-6D42-6561636F6E74': {
      identifier: STATIC_ID,
      minor: 4949,
      major: 3838,
      in_range: false,
    },
    '426C7565-4368-6172-6D42-6561636F6E73': {
      identifier: STATIC_ID,
      minor: 4949,
      major: 3838,
      in_range: false,
    },
  });
  const [isScanningClassic, setIsScanningClassic] = useState(false);
  const [isScanningBLE, setIsScanningBLE] = useState(false);
  const [isClassic, setIsClassic] = useState(false);
  const [newUUID, setNewUUID] = useState<String>(null);
  const [newMajor, setNewMajor] = useState<number>(undefined);
  const [newMinor, setNewMinor] = useState<number>(undefined);
  const { colors } = useTheme();

  // Flattens the `sampleBeacons` into an array of BLEBeaconDevices
  function beaconsToArray() {
    return Object.entries(sampleBLEDevices).map(([uuid, device]) => ({
      uuid,
      ...device,
    }));
  }

  // Function to run Bluetooth Classic test and update logs
  async function runBluetoothClassicTest() {
    // Classic not currently supported on iOS
    if (window['cordova'].platformId == 'ios') {
      displayErrorMsg('Sorry, iOS is not supported!', 'OSError');
      return;
    }

    try {
      let response = await window['cordova'].plugins.BEMDataCollection.bluetoothScanPermissions();
      if (response != 'OK') {
        displayErrorMsg('Please Enable Bluetooth!', 'Insufficient Permissions');
        return;
      }
    } catch (e) {
      displayError(e, 'Insufficient Permissions');
      return;
    }

    try {
      setIsScanningClassic(true);
      const newLogs = await gatherBluetoothClassicData(t);
      setBluetoothClassicList(newLogs);
    } catch (error) {
      logWarn(error);
    } finally {
      setIsScanningClassic(false);
    }
  }

  function setRangeStatus(uuid: string, result: string, status: boolean) {
    setSampleBLEDevices((prevDevices) => ({
      ...prevDevices,
      [uuid]: {
        ...prevDevices[uuid],
        result: result,
        in_range: status,
      },
    }));
  }

  // BLE LOGIC
  async function startBeaconScanning() {
    setIsScanningBLE(true);

    let delegate = new window['cordova'].plugins.locationManager.Delegate();

    delegate.didDetermineStateForRegion = function (pluginResult: BLEPluginCallback) {
      // `stateInside`is returned when the user enters the beacon region
      // `StateOutside` is either (i) left region, or (ii) started scanner (outside region)
      const pluginResultStr = JSON.stringify(pluginResult, null, 2);
      if (pluginResult.state == 'CLRegionStateInside') {
        // need toUpperCase(), b/c callback returns with only lowercase values...
        setRangeStatus(pluginResult.region.uuid.toUpperCase(), pluginResultStr, true);
      } else if (pluginResult.state == 'CLRegionStateOutside') {
        setRangeStatus(pluginResult.region.uuid.toUpperCase(), pluginResultStr, false);
      }
      logDebug('[BLE] didDetermineStateForRegion');
      logDebug(pluginResultStr);
      window['cordova'].plugins.locationManager.appendToDeviceLog(
        '[DOM] didDetermineStateForRegion: ' + pluginResultStr,
      );
    };

    delegate.didStartMonitoringForRegion = function (pluginResult) {
      logDebug('[BLE] didStartMonitoringForRegion');
      logDebug(JSON.stringify(pluginResult));
    };

    delegate.didRangeBeaconsInRegion = function (pluginResult) {
      // Not seeing this called...
      logDebug('[BLE] didRangeBeaconsInRegion');
      logDebug(JSON.stringify(pluginResult));
    };

    window['cordova'].plugins.locationManager.setDelegate(delegate);

    // Setup regions for each beacon
    beaconsToArray().forEach((sampleBeacon: BLEBeaconDevice) => {
      // Use NULL for wildcard
      // Need UUID value on iOS only, not Android (2nd parameter)
      // https://stackoverflow.com/questions/38580410/how-to-scan-all-nearby-ibeacons-using-coordova-based-hybrid-application
      const beaconRegion = new window['cordova'].plugins.locationManager.BeaconRegion(
        STATIC_ID,
        sampleBeacon.uuid,
        sampleBeacon.major,
        sampleBeacon.minor,
      );
      window['cordova'].plugins.locationManager
        .startMonitoringForRegion(beaconRegion)
        .fail(function (e) {
          logWarn(e);
        })
        .done();
    });
  }

  async function stopBeaconScanning() {
    setIsScanningBLE(false);

    beaconsToArray().forEach((sampleBeacon: BLEBeaconDevice) => {
      setRangeStatus(sampleBeacon.uuid, false); // "zero out" the beacons
      const beaconRegion = new window['cordova'].plugins.locationManager.BeaconRegion(
        STATIC_ID,
        sampleBeacon.uuid,
        sampleBeacon.major,
        sampleBeacon.minor,
      );
      window['cordova'].plugins.locationManager
        .stopMonitoringForRegion(beaconRegion)
        .fail(function (e) {
          logWarn(e);
        })
        .done();
    });
  }

  const switchMode = () => {
    setIsClassic(!isClassic);
  };

  // Add a beacon with the new UUID to the list of BLE devices to scan
  function addNewUUID(newUUID: string, newMajor: number, newMinor: number) {
    console.log('Before adding UUID ' + newUUID + ' entries = ' + sampleBLEDevices);
    const devicesWithAddition = { ...sampleBLEDevices };
    devicesWithAddition[newUUID] = {
      identifier: STATIC_ID,
      minor: newMajor,
      major: newMinor,
      in_range: false,
    };
    setSampleBLEDevices(devicesWithAddition);
    setNewUUID(null);
    setNewMajor(undefined);
    setNewMinor(undefined);
  }

  const BluetoothCardList = ({ devices }) => {
    if (isClassic) {
      // When in classic mode, render devices as normal
      return (
        <div>
          {devices.map((device) => {
            if (device) {
              return <BluetoothCard device={device} isClassic={isClassic} key={device.id} />;
            }
            return null;
          })}
        </div>
      );
    }
    const beaconsAsArray = beaconsToArray();
    return (
      <div>
        {beaconsAsArray.map((beacon) => {
          if (beacon) {
            return (
              <BluetoothCard device={beacon} isScanningBLE={isScanningBLE} key={beacon.uuid} />
            );
          }
        })}
      </div>
    );
  };

  const ScanButton = () => {
    if (isClassic) {
      return (
        <View style={s.btnContainer}>
          <Button
            mode="elevated"
            onPress={runBluetoothClassicTest}
            textColor={isScanningClassic ? colors.onPrimary : colors.primary}
            buttonColor={isScanningClassic ? colors.primary : colors.onPrimary}
            style={s.btn}>
            {isScanningClassic ? t('bluetooth.is-scanning') : t('bluetooth.scan.for-bluetooth')}
          </Button>
        </View>
      );
    }
    // else, if BLE
    return (
      <View style={s.btnContainer}>
        <Button
          mode="elevated"
          onPress={isScanningBLE ? stopBeaconScanning : startBeaconScanning}
          textColor={isScanningBLE ? colors.onPrimary : colors.primary}
          buttonColor={isScanningBLE ? colors.primary : colors.onPrimary}
          style={s.btn}>
          {isScanningBLE ? t('bluetooth.scan.stop') : t('bluetooth.scan.for-ble')}
        </Button>
      </View>
    );
  };

  const BlueScanContent = () => (
    <div style={{ height: '100%' }}>
      <Appbar.Header
        statusBarHeight={0}
        elevated={true}
        style={{ height: 46, backgroundColor: colors.surface }}>
        <Appbar.BackAction
          onPress={() => {
            props.onDismiss?.();
          }}
        />
        <Appbar.Content
          title={isClassic ? t('bluetooth.title.classic') : t('bluetooth.title.ble')}
          titleStyle={{ fontSize: 17 }}
        />
      </Appbar.Header>
      <View style={s.btnContainer}>
        <Button
          mode="elevated"
          onPress={switchMode}
          textColor={colors.primary}
          style={s.btn}
          buttonColor={colors.onPrimary}>
          {isClassic ? t('bluetooth.switch-to.ble') : t('bluetooth.switch-to.classic')}
        </Button>
      </View>
      <ScanButton />
      <BluetoothCardList devices={isClassic ? bluetoothClassicList : sampleBLEDevices} />
    </div>
  );

  return (
    <>
      <Modal {...props} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flex: 1 }}>
            <BlueScanContent />
          </ScrollView>
          <TextInput
            label="New UUID (mandatory)"
            value={newUUID || ''}
            onChangeText={(t) => setNewUUID(t.toUpperCase())}
          />
          <TextInput
            label="Major (optional)"
            value={newMajor || ''}
            onChangeText={(t) => setNewMajor(t)}
          />
          <TextInput
            label="Minor (optional)"
            value={newMinor || ''}
            onChangeText={(t) => setNewMinor(t)}
          />
          <Button disabled={!newUUID} onPress={() => addNewUUID(newUUID, newMajor, newMinor)}>
            Add New Beacon To Scan
          </Button>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  btnContainer: {
    padding: 8,
    justifyContent: 'center',
  },
  btn: {
    height: 38,
    fontSize: 11,
    margin: 4,
  },
});

export default BluetoothScanPage;
