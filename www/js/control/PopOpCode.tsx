import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { Button, Text, IconButton, Dialog, useTheme, ModalProps } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import QrCode from '../components/QrCode';
import { Alerts } from '../components/AlertArea';
import { settingStyles } from './ProfileSettings';

function copyText(textToCopy) {
  navigator.clipboard.writeText(textToCopy).then(() => {
    Alerts.addMessage({ text: 'Copied to clipboard!' });
  });
}

type Props = ModalProps & {
  token: string;
  onShare: () => void;
};
const PopOpCode = ({ token, onShare, ...props }: Props) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal transparent={true} {...props}>
      <Dialog
        visible={props.visible}
        onDismiss={props.onDismiss}
        style={settingStyles.dialog(colors.elevation.level3)}>
        <Dialog.Title>{t('general-settings.qrcode')}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          <Text style={styles.text}>{t('general-settings.qrcode-share-title')}</Text>
          <QrCode value={token} style={{ marginHorizontal: 8 }}></QrCode>
          <Text style={styles.opcode}>{token}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <IconButton icon="share" onPress={() => onShare()} style={styles.button} />
          {window['cordova'].platformId == 'ios' && (
            <IconButton icon="content-copy" onPress={() => copyText(token)} style={styles.button} />
          )}
          <Button onPress={props.onDismiss} style={styles.button}>
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
