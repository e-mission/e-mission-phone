import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Modal, ScrollView, SafeAreaView, View, Text } from 'react-native';
import { gatherBluetoothData, startBLEScanning } from './blueoothScanner';
import { logWarn, displayError, displayErrorMsg } from '../plugin/logger';
import { getConfig } from '../config/dynamicConfig';
import BluetoothCard from './BluetoothCard';
import { Appbar, useTheme, Button } from 'react-native-paper';

/**
 * The implementation of this scanner page follows the design of
 * `www/js/survey/enketo/EnketoModal.tsx`!
 *
 * Future work may include refractoring these files to be implementations of a
 * single base "pop-up page" component
 */

const BluetoothScanPage = ({ ...props }: any) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isClassic, setIsClassic] = useState(false);
  const { colors } = useTheme();

  // Function to run Bluetooth Classic test and update logs
  const runBluetoothTest = async () => {
    let permissionFunction;
    // Depending on user platform, handle requesting the permissions differently
    if (window['cordova'].platformId == 'android') {
      permissionFunction = window['cordova'].plugins.BEMDataCollection.bluetoothScanPermissions();
    } else {
      permissionFunction = window['bluetoothClassicSerial'].initializeBluetooth();
    }
    if (!permissionFunction) {
      displayErrorMsg('PlatformID Not Found', 'OSError');
      return;
    }

    try {
      const response = await permissionFunction();
      if (response != 'OK') {
        displayErrorMsg('Please Enable Bluetooth!', 'Insufficient Permissions');
        return;
      }
      if (window['cordova'].platformId == 'ios') {
        displayErrorMsg('Sorry, iOS is not supported!', 'OSError');
        return;
      }
    } catch (e) {
      displayError(e, 'Insufficient Permissions');
      return;
    }

    try {
      setIsScanning(true);
      const newLogs = await gatherBluetoothData(t);
      setLogs(newLogs);
    } catch (error) {
      logWarn(error);
    } finally {
      setIsScanning(false);
    }
  };

  const runBLETest = async () => {
    //await startBLEScanning();
    BeaconMonitor(); // Will combine BeaconMonitor & StartBLE Scanning, if possible
  };

  // BLE LOGIC
  const BeaconMonitor = () => {
    setTestLogs([]);

    const logToDom = (message) => {
      setTestLogs((prevLogs) => [...prevLogs, message]);
    };

    logToDom('HELLO');
    logToDom('HELLO2');

    let delegate = new window['cordova'].plugins.locationManager.Delegate();
    logToDom(delegate);

    delegate.didDetermineStateForRegion = function (pluginResult) {
      logToDom('[BLE] didDetermineStateForRegion');
      logToDom(JSON.stringify(pluginResult));
      window['cordova'].plugins.locationManager.appendToDeviceLog(
        '[DOM] didDetermineStateForRegion: ' + JSON.stringify(pluginResult),
      );
    };

    delegate.didStartMonitoringForRegion = function (pluginResult) {
      logToDom('[BLE] didStartMonitoringForRegion');
      logToDom(JSON.stringify(pluginResult));
    };

    delegate.didRangeBeaconsInRegion = function (pluginResult) {
      logToDom('[BLE] didRangeBeaconsInRegion');
      logToDom(JSON.stringify(pluginResult));
    };

    var uuid = '426C7565-4368-6172-6D42-6561636F6E73';
    var identifier = 'Louis-Beacon';
    var minor = 4949;
    var major = 3838;

    // Use NULL for wildcard
    // Need UUID value on iOS only, not Android (2nd parameter)
    // https://stackoverflow.com/questions/38580410/how-to-scan-all-nearby-ibeacons-using-coordova-based-hybrid-application
    var beaconRegion = new window['cordova'].plugins.locationManager.BeaconRegion(
      identifier,
      uuid,
      major,
      minor,
    );

    window['cordova'].plugins.locationManager.setDelegate(delegate);

    // TODO:
    // ADD IN iOS PERMISSION CHECKS HERE

    window['cordova'].plugins.locationManager
      .startMonitoringForRegion(beaconRegion)
      .fail(function (e) {
        logToDom(e);
      })
      .done();
  };

  const switchMode = () => {
    setIsClassic(!isClassic);
  };

  const BluetoothCardList = ({ devices }) => (
    <div>
      {devices.map((device) => {
        if (device) {
          return <BluetoothCard device={device} />;
        }
        return null;
      })}
    </div>
  );

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
          textColor={isClassic ? colors.onPrimary : colors.primary}
          style={s.btn}
          buttonColor={isClassic ? colors.primary : colors.onPrimary}>
          {isClassic ? t('bluetooth.switch-to.ble') : t('bluetooth.switch-to.classic')}
        </Button>
      </View>
      <View style={s.btnContainer}>
        <Button
          mode="elevated"
          onPress={isClassic ? runBluetoothClassicTest : runBLETest}
          textColor={isScanning ? colors.onPrimary : colors.primary}
          buttonColor={isScanning ? colors.primary : colors.onPrimary}
          style={s.btn}>
          {isScanning
            ? t('bluetooth.is-scanning')
            : isClassic
            ? t('bluetooth.scan.for-bluetooth')
            : t('bluetooth.scan.for-ble')}
        </Button>
      </View>
      <Button mode="elevated" onPress={runBLETest} style={s.btn}>
        {'TEST BLE'}
      </Button>
      <BluetoothCardList devices={logs} />
      <ScrollView>
        {testLogs.map((l) => (
          <div>{l}</div>
        ))}
      </ScrollView>
    </div>
  );

  return (
    <>
      <Modal {...props} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flex: 1 }}>
            <BlueScanContent />
          </ScrollView>
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
