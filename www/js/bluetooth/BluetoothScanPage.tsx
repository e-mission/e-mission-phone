import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Modal, ScrollView, SafeAreaView, View } from 'react-native';
import gatherBluetoothData from './blueoothScanner';
import { logWarn, displayErrorMsg } from '../plugin/logger';
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
  const [isScanning, setIsScanning] = useState(false);
  const [isClassic, setIsClassic] = useState(false);
  const { colors } = useTheme();

  const runBluetoothClassicTest = async () => {
    let config = await getConfig();

    if (!config.ios_use_remote_push) {
      displayErrorMsg('Sorry, Bluetooth Classic scanning is not available on iOS!', 'OS Error:');
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
    displayErrorMsg('Not Implemented Yet!', '404:');
  };

  const switchMode = () => {
    setIsClassic(!isClassic);
  };

  const BluetoothCardList = ({ devices }) => (
    <div>
      {devices.map((device) => {
        if (device) {
          const deviceID = device.slice(0, 21);
          const deviceName = device.slice(21);
          return <BluetoothCard deviceName={deviceName} deviceData={deviceID} />;
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
      <BluetoothCardList devices={logs} />
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
