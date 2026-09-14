import React, { useContext } from 'react';
import { Modal, ModalProps, View, useWindowDimensions, ScrollView, StyleSheet } from 'react-native';
import { Button, Dialog, IconButton, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import color from 'color';
import { AppContext } from '../../AppContext';
import { getProgramAdminEmail, launchAccessoryRequestEmail } from '../../services/emailHelper';

export interface AccessoryRequestModalProps extends ModalProps {
  vehicleId?: string;
  requestedAccessories?: string[];
  onEmailSent?: () => void;
}

const AccessoryRequestModal = ({
  vehicleId = '',
  requestedAccessories = [],
  onEmailSent,
  ...props
}: AccessoryRequestModalProps) => {
  const { height: windowHeight } = useWindowDimensions();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { appConfig, onboardingState } = useContext(AppContext);

  const adminEmail = getProgramAdminEmail(appConfig);

  const handleSendEmail = () => {
    if (appConfig && onboardingState) {
      const sent = launchAccessoryRequestEmail({
        appConfig,
        opcode: onboardingState.opcode,
        vehicleId,
        requestedAccessories,
      });
      if (sent) {
        onEmailSent?.();
      }
    }
    props.onDismiss?.();
  };

  return (
    <Modal transparent={true} {...props}>
      <Dialog
        visible={props.visible}
        onDismiss={props.onDismiss}
        style={[styles.dialog, { backgroundColor: colors.elevation.level3 }]}>
        <Dialog.Title>{t('library.checkout.accessory-modal-title')}</Dialog.Title>
        <Dialog.Content style={{ maxHeight: windowHeight / 1.5, paddingBottom: 0 }}>
          <ScrollView>
            <Text>{t('library.checkout.accessory-modal-message')}</Text>
            {requestedAccessories.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                  {t('library.checkout.accessory-modal-requested-heading')}
                </Text>
                {requestedAccessories.map((acc, index) => (
                  <Text key={index} style={{ marginLeft: 8 }}>
                    • {acc}
                  </Text>
                ))}
              </View>
            )}
            {adminEmail && (
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 12,
                  paddingRight: 8,
                }}>
                <IconButton
                  icon="email-edit-outline"
                  size={18}
                  iconColor={color(colors.onSurface).alpha(0.7).rgb().string()}
                  style={{ margin: 0 }}
                />
                <Text variant="bodySmall">{adminEmail}</Text>
              </View>
            )}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={props.onDismiss}>
            {t('library.checkout.accessory-modal-no-thanks')}
          </Button>
          <Button onPress={handleSendEmail}>
            {t('library.checkout.accessory-modal-compose-email')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    margin: 5,
    marginLeft: 25,
    marginRight: 25,
  },
});

export default AccessoryRequestModal;
