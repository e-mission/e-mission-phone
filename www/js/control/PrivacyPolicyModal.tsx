import React from 'react';
import { Modal, useWindowDimensions, ScrollView } from 'react-native';
import { Dialog, Button, useTheme, ModalProps } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import PrivacyPolicy from '../onboarding/PrivacyPolicy';
import { settingStyles } from './ProfileSettings';

const PrivacyPolicyModal = ({ ...props }: ModalProps) => {
  const { height: windowHeight } = useWindowDimensions();
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal transparent={true} {...props}>
      <Dialog
        visible={props.visible}
        onDismiss={props.onDismiss}
        style={settingStyles.dialog(colors.elevation.level3)}>
        <Dialog.Content style={{ maxHeight: windowHeight / 1.5, paddingBottom: 0 }}>
          <ScrollView>
            <PrivacyPolicy></PrivacyPolicy>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={props.onDismiss}>{t('join.close')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

export default PrivacyPolicyModal;
