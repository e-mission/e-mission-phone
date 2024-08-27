import React, { useState } from 'react';
import { Modal } from 'react-native';
import { Dialog, Button, ModalProps, useTheme, Text, TextInput } from 'react-native-paper';
import { settingStyles } from './ProfileSettings';
import { useTranslation } from 'react-i18next';
import { uploadFile } from './uploadService';

const UploadLogModal = (props: ModalProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [uploadReason, setUploadReason] = useState<string | undefined>(undefined);

  return (
    <Modal transparent={true} {...props}>
      <Dialog
        visible={props.visible}
        onDismiss={props.onDismiss}
        style={settingStyles.dialog(colors.elevation.level3)}>
        <Dialog.Title>{t('upload-service.upload-database', { db: 'loggerDB' })}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Reason"
            value={uploadReason}
            onChangeText={(uploadReason) => setUploadReason(uploadReason)}
            placeholder={t('upload-service.please-fill-in-what-is-wrong')}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={props.onDismiss}>{t('general-settings.cancel')}</Button>
          <Button
            onPress={() => {
              if (uploadReason != '') {
                let reason = uploadReason;
                uploadFile('loggerDB', reason);
                props.onDismiss?.();
              }
            }}>
            Upload
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

export default UploadLogModal;
