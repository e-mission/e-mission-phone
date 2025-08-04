import React from 'react';
import { Modal } from 'react-native';
import { Dialog, Button, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { settingStyles } from '../control/ProfileSettings';

const ActionMenu = ({ visible, onDismiss, title, actionSet, onAction }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} onDismiss={onDismiss} transparent={true}>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={settingStyles.dialog(colors.elevation.level3)}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          {actionSet?.map((e) => (
            <Button
              key={e.text}
              onPress={() => {
                onAction(e);
                onDismiss();
              }}>
              {e.text}
            </Button>
          ))}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('general-settings.cancel')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

export default ActionMenu;
