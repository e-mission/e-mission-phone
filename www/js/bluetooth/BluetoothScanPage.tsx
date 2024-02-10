import React, { useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../App';
import { StyleSheet, Text, Modal, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { gatherData } from './blueoothScanner';

/**
 * The implementation of this scanner page follows the design of
 * `www/js/survey/enketo/EnketoModal.tsx`!
 *
 * Future work may include refractoring these files to be implementations of a
 * single base "pop-up page" component
 */
const BluetoothScanPage = ({ ...props }: any) => {
  const { t } = useTranslation();
  const context = useContext(AppContext); // May not be necessary
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {

  }, []); 

  // Function to run Bluetooth test and update logs
  const runBluetoothTest = async () => {
    try {
      setLogs(["Loading..."]);
      const newLogs = await gatherData();
      setLogs(newLogs);
    } catch (error) {
      console.error(error);
      // Handle error
    }
  };

  const BlueScanContent = (
    <div style={{ height: '100%' }}>
      <header>
        {
          // TODO: Fix background color of button
          <button style={s.dismissBtn} onClick={() => props.onDismiss?.()}>
            <span style={{ fontFamily: 'MaterialCommunityIcons', fontSize: 24, marginRight: 5 }}>
              󰁍
            </span>
            <span>{t('survey.dismiss')}</span>
          </button>
        }
      </header>
      <Text>{'Add Scanner Components here!'}</Text>
      <button style={s.btn} onClick={() => window['cordova'].plugins.BEMDataCollection.bluetoothScanPermissions()}>
        <Text>{'Permissions'}</Text>
      </button>
      <button style={s.btn} onClick={runBluetoothTest}>
        <Text>{'Scan'}</Text>
      </button>
      <h3>Console Output:</h3>
      {logs.map((log, index) => (
        <p key={index}>{log}</p>
      ))}
    </div>
  );

  return (
    <>
      <Modal {...props} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flex: 1 }}>
            <Pressable style={{ flex: 1 }}>
              <div> {BlueScanContent} </div>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  dismissBtn: {
    height: 38,
    fontSize: 11,
    color: '#222',
    marginRight: 'auto',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  btn: {
    display: 'flex'
  }
});

export default BluetoothScanPage;
