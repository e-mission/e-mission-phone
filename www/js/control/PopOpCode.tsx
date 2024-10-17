import React, { useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { Button, Text, IconButton, Dialog, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import QrCode from '../components/QrCode';
import { AlertManager } from '../components/AlertBar';
import { settingStyles } from './ProfileSettings';

const PopOpCode = ({ visibilityValue, token, action, setVis }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  function copyText(textToCopy) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      AlertManager.addMessage({ msgKey: 'Copied to clipboard!' });
    });
  }

  let copyButton;
  if (window['cordova'].platformId == 'ios') {
    copyButton = (
      <IconButton icon="content-copy" onPress={() => copyText(token)} style={styles.button} />
    );
  }

  return (
    <Modal visible={visibilityValue} onDismiss={() => setVis(false)} transparent={true}>
      <Dialog
        visible={visibilityValue}
        onDismiss={() => setVis(false)}
        style={settingStyles.dialog(colors.elevation.level3)}>
        <Dialog.Title>{t('general-settings.qrcode')}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          <Text style={styles.text}>{t('general-settings.qrcode-share-title')}</Text>
          <QrCode value={token} style={{ marginHorizontal: 8 }}></QrCode>
          <Text style={styles.opcode}>{token}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <IconButton icon="share" onPress={() => action()} style={styles.button} />
          {copyButton}
          <Button onPress={() => setVis(false)} style={styles.button}>
            {t('general-settings.cancel')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};
const styles = StyleSheet.create({
  title: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  },
  button: {
    margin: 'auto',
  },
  opcode: {
    fontFamily: 'monospace',
    wordBreak: 'break-word',
    marginTop: 5,
  },
  text: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
});

export default PopOpCode;
