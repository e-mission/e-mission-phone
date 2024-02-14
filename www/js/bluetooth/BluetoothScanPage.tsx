import React, { useEffect, useState } from 'react';
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
      const newLogs = await gatherBluetoothData();
      setLogs(newLogs);
    } catch (error) {
      logWarn(error);
      // TODO: Handle error further
    }
  };

  useEffect(() => {
    let intervalId;
    if (isScanning) {
      intervalId = setInterval(runBluetoothTest, 5000);
    } else {
      clearInterval(intervalId);
    }
    return () => clearInterval(intervalId);
  }, [isScanning]);

  const handleToggle = () => {
    setIsScanning(!isScanning);
  };

  const BlueScanContent = (
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
        <Button
          mode="elevated"
          onPress={handleToggle}
          textColor={isScanning ? colors.onPrimary : colors.primary}
          style={s.btn}
          buttonColor={isScanning ? colors.primary : colors.onPrimary}>
          {isScanning ? t('bluetooth.is-scanning') : t('bluetooth.scan-for-bluetooth')}
        </Button>
      </View>

      {logs.map((log, index) => (
        <BluetoothCard deviceName={log} deviceData={index} />
      ))}
    </div>
  );

  return (
    <>
      <Modal {...props} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flex: 1 }}>
            <div> {BlueScanContent} </div>
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
