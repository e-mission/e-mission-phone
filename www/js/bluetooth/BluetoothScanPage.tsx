import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Modal, ScrollView, SafeAreaView, View } from 'react-native';
import gatherBluetoothData from './blueoothScanner';
import { logWarn } from '../plugin/logger';
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
  const { colors } = useTheme();

  // Function to run Bluetooth test and update logs
  const runBluetoothTest = async () => {
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
        <Appbar.Content title={t('bluetooth.scan-debug-title')} titleStyle={{ fontSize: 17 }} />
      </Appbar.Header>
      <View style={s.btnContainer}>
        <Button mode="elevated" onPress={runBluetoothTest} textColor={colors.primary} style={s.btn}>
          {isScanning ? t('bluetooth.is-scanning') : t('bluetooth.scan-for-bluetooth')}
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
    padding: 16,
    justifyContent: 'center',
  },
  btn: {
    height: 38,
    fontSize: 11,
    margin: 4,
  },
});

export default BluetoothScanPage;
