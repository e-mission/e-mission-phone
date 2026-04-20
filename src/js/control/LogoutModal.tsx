import React from 'react';
import { Modal } from 'react-native';
import { Dialog, Button, ModalProps, useTheme, Text } from 'react-native-paper';
import { settingStyles } from './ProfileSettings';
import { useTranslation } from 'react-i18next';
import { resetDataAndRefresh } from '../config/dynamicConfig';

const LogoutModal = (props: ModalProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal transparent={true} {...props}>
      <Dialog
        visible={props.visible}
        onDismiss={props.onDismiss}
        style={settingStyles.dialog(colors.elevation.level3)}>
        <Dialog.Title>{t('general-settings.are-you-sure')}</Dialog.Title>
        <Dialog.Content>
          <Text>{t('general-settings.log-out-warning')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={props.onDismiss}>{t('general-settings.cancel')}</Button>
          <Button
            onPress={() => {
              resetDataAndRefresh();
            }}>
            {t('general-settings.confirm')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

export default LogoutModal;
