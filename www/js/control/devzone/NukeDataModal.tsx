import React from 'react';
import { Modal } from 'react-native';
import { Dialog, Button, ModalProps, useTheme } from 'react-native-paper';
import { storageClear } from '../../plugin/storage';
import { settingStyles } from '../ProfileSettings';
import { useTranslation } from 'react-i18next';

const NukeDataModal = (props: ModalProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal transparent={true} {...props}>
      <Dialog
        visible={props.visible}
        onDismiss={props.onDismiss}
        style={settingStyles.dialog(colors.elevation.level3)}>
        <Dialog.Title>{t('general-settings.clear-data')}</Dialog.Title>
        <Dialog.Content>
          <Button
            onPress={() => {
              storageClear({ local: true });
              props.onDismiss?.();
            }}>
            {t('general-settings.nuke-ui-state-only')}
          </Button>
          <Button
            onPress={() => {
              storageClear({ native: true });
              props.onDismiss?.();
            }}>
            {t('general-settings.nuke-native-cache-only')}
          </Button>
          <Button
            onPress={() => {
              storageClear({ local: true, native: true });
              props.onDismiss?.();
            }}>
            {t('general-settings.nuke-everything')}
          </Button>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={props.onDismiss}>{t('general-settings.cancel')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

export default NukeDataModal;
