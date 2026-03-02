import React, { useState } from 'react';
import { Modal, useWindowDimensions, ScrollView, View } from 'react-native';
import {
  Dialog,
  Button,
  useTheme,
  ModalProps,
  Text,
  IconButton,
  Checkbox,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import color from 'color';
import { settingStyles } from './ProfileSettings';
import useAppConfig from '../useAppConfig';
import DeploymentConfig from 'op-deployment-configs';
import { t } from 'i18next';
import { getDeviceSettings } from '../splash/storeDeviceSettings';
import { getStudyNameFromToken } from '../config/opcode';
import { logDebug } from '../plugin/logger';
import { Alerts } from '../components/AlertArea';

const launchUrl = (url: string) => window['cordova'].InAppBrowser.open(url, '_system');

// adapted from https://github.com/dpa99c/cordova-launch-review?tab=readme-ov-file#advanced-usage
function launchReview() {
  window['LaunchReview'].launch(
    () => {
      logDebug('LaunchReview.launch success');
    },
    (e) => {
      Alerts.addMessage({
        text: "Couldn't open the store to leave a review. Please try again later.",
      });
    },
  );
}

async function launchFeedbackEmail(appConfig: DeploymentConfig, recipients: string[]) {
  const deploymentId = appConfig.url_abbreviation || getStudyNameFromToken(appConfig.joined.opcode);
  const subject = t('control.feedback-modal.feedback-email-subject', { deploymentId });

  const deviceSettings = await getDeviceSettings();
  let diagnosticInfo = '';
  if (deviceSettings) {
    diagnosticInfo =
      `- App version: ${deviceSettings.client_app_version}\n` +
      `- Device model: ${deviceSettings.manufacturer} ${deviceSettings.model}\n` +
      `- Deployment: ${deploymentId}\n`;
  }
  let body = t('control.feedback-modal.feedback-email-body', { diagnosticInfo });

  const mailtoLink =
    `mailto:${recipients.join(',')}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  launchUrl(mailtoLink);
}

const FeedbackModal = ({ ...props }: ModalProps) => {
  const { height: windowHeight } = useWindowDimensions();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const appConfig = useAppConfig();
  const [userAffect, setUserAffect] = useState<null | 'positive' | 'negative'>(null);
  const [feedbackForDev, setFeedbackForDev] = useState(false);
  const [feedbackForAdmins, setFeedbackForAdmins] = useState(false);

  const lang = i18n.resolvedLanguage || 'en';
  const deploymentName = appConfig?.intro.translated_text[lang].deployment_name;

  const emailRecipients: string[] = [];
  if (feedbackForDev) {
    emailRecipients.push('openpath@nlr.gov');
  }
  if (feedbackForAdmins) {
    let adminEmail: string | undefined =
      appConfig?.intro.program_admin_email ||
      // TODO: can remove this after config auto-update has been on prod for awhile
      appConfig?.intro.program_admin_contact.match(
        /([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi,
      )?.[0];

    if (adminEmail) {
      emailRecipients.push(adminEmail);
    }
  }

  function dismissModal() {
    setUserAffect(null);
    props.onDismiss?.();
  }

  let modalContent = '';
  if (userAffect == null) {
    modalContent = t('control.feedback-modal.experience-question', {
      appName: t('join.app-name'),
    });
  } else if (userAffect == 'positive') {
    modalContent =
      window['cordova']?.platformId == 'ios'
        ? t('control.feedback-modal.leave-review-ios', { deploymentPartnerName: deploymentName })
        : t('control.feedback-modal.leave-review-android', {
            deploymentPartnerName: deploymentName,
          });
  } else if (userAffect == 'negative') {
    modalContent = t('control.feedback-modal.leave-feedback');
  }

  return (
    <Modal transparent={true} {...props}>
      <Dialog
        visible={props.visible}
        onDismiss={props.onDismiss}
        style={settingStyles.dialog(colors.elevation.level3)}>
        <Dialog.Content style={{ maxHeight: windowHeight / 1.5, paddingBottom: 0 }}>
          <ScrollView>
            <Dialog.Content>
              <Text>{modalContent}</Text>
              {userAffect == 'negative' && (
                <View style={{ marginTop: 16, marginBottom: 8, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox
                      status={feedbackForDev ? 'checked' : 'unchecked'}
                      onPress={() => setFeedbackForDev(!feedbackForDev)}
                    />
                    <Text>{t('control.feedback-modal.feedback-for-devs')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox
                      status={feedbackForAdmins ? 'checked' : 'unchecked'}
                      onPress={() => setFeedbackForAdmins(!feedbackForAdmins)}
                    />
                    <Text>
                      {t('control.feedback-modal.feedback-for-admin', { deploymentName })}
                    </Text>
                  </View>
                  {emailRecipients.length > 0 && (
                    <View
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 4,
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 8,
                      }}>
                      <IconButton
                        icon="email-edit-outline"
                        size={18}
                        iconColor={color(colors.onSurface).alpha(0.7).rgb().string()}
                        style={{ margin: 0 }}
                      />
                      <Text variant="bodySmall">{emailRecipients.join(', ')}</Text>
                    </View>
                  )}
                </View>
              )}
            </Dialog.Content>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          {userAffect == null && (
            <>
              <IconButton
                iconColor={color(colors.onSurface).alpha(0.7).rgb().string()}
                icon="thumb-down"
                contentStyle={{ height: 56 }}
                onPress={() => setUserAffect('negative')}
              />
              <IconButton
                iconColor={colors.primary}
                icon="thumb-up"
                contentStyle={{ height: 56 }}
                onPress={() => setUserAffect('positive')}
              />
            </>
          )}
          {userAffect == 'positive' && (
            <>
              <Button onPress={dismissModal}>{t('control.feedback-modal.no-thanks')}</Button>
              <Button onPress={launchReview}>{t('control.feedback-modal.sure')}</Button>
            </>
          )}
          {userAffect == 'negative' && (
            <>
              <Button onPress={dismissModal}>{t('control.feedback-modal.no-thanks')}</Button>
              <Button
                disabled={!feedbackForDev && !feedbackForAdmins}
                onPress={() => launchFeedbackEmail(appConfig, emailRecipients)}>
                {t('control.feedback-modal.compose-email')}
              </Button>
            </>
          )}
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

export default FeedbackModal;
