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

const launchUrl = (url: string) => window['cordova'].InAppBrowser.open(url, '_system');

// BEGIN: code adapted from https://github.com/dpa99c/cordova-launch-review README
//max time to wait for rating dialog to display on iOS
const MAX_DIALOG_WAIT_TIME_IOS = 5 * 1000;

//max time to wait for rating dialog to display on Android and be submitted by user
const MAX_DIALOG_WAIT_TIME_ANDROID = 60 * 1000;

let ratingTimerId;

function ratingDialogNotShown() {
  let msg;
  if (window['cordova'].platformId === 'android') {
    msg = 'Rating dialog outcome not received (after ' + MAX_DIALOG_WAIT_TIME_ANDROID + 'ms)';
  } else if (window['cordova'].platformId === 'ios') {
    msg = 'Rating dialog was not shown (after ' + MAX_DIALOG_WAIT_TIME_IOS + 'ms)';
  }
  console.warn(msg);
}

function rating() {
  if (window['cordova'].platformId === 'android') {
    ratingTimerId = setTimeout(ratingDialogNotShown, MAX_DIALOG_WAIT_TIME_ANDROID);
  }

  window['LaunchReview'].rating(
    function (status) {
      if (status === 'requested') {
        if (window['cordova'].platformId === 'android') {
          console.log('Displayed rating dialog');
          clearTimeout(ratingTimerId);
        } else if (window['cordova'].platformId === 'ios') {
          console.log('Requested rating dialog');
          ratingTimerId = setTimeout(ratingDialogNotShown, MAX_DIALOG_WAIT_TIME_IOS);
        }
      } else if (status === 'shown') {
        console.log('Rating dialog displayed');
        clearTimeout(ratingTimerId);
      } else if (status === 'dismissed') {
        console.log('Rating dialog dismissed');
        clearTimeout(ratingTimerId);
      }
    },
    function (err) {
      console.error('Error launching rating dialog: ' + err);
      clearTimeout(ratingTimerId);
    },
  );
}

function launchReview() {
  if (window['LaunchReview'].isRatingSupported()) {
    rating();
  } else {
    window['LaunchReview'].launch();
  }
}

// END

async function launchFeedbackEmail(
  appConfig: DeploymentConfig,
  sendToDev: boolean,
  sendToAdmin: boolean,
) {
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

  const recipients: string[] = [];
  if (sendToDev) {
    recipients.push('openpath@nlr.gov');
  }
  if (sendToAdmin) {
    recipients.push(appConfig.intro.program_admin_email);
  }

  const mailtoLink =
    `mailto:${recipients.join(',')}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  launchUrl(mailtoLink);
}

const FeedbackModal = ({ ...props }: ModalProps) => {
  const { height: windowHeight } = useWindowDimensions();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const appConfig = useAppConfig();
  const [userAffect, setUserAffect] = useState<null | 'positive' | 'negative'>(null);
  const [feedbackForDev, setFeedbackForDev] = useState(false);
  const [feedbackForAdmins, setFeedbackForAdmins] = useState(false);

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
        ? t('control.feedback-modal.leave-review-ios')
        : t('control.feedback-modal.leave-review-android');
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
                <View style={{ marginTop: 16, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox
                      status={feedbackForDev ? 'checked' : 'unchecked'}
                      onPress={() => setFeedbackForDev(!feedbackForDev)}
                    />
                    <Text>{t('control.feedback-modal.feedback-for-devs')}</Text>
                  </View>
                  {appConfig?.intro?.program_admin_contact && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Checkbox
                        status={feedbackForAdmins ? 'checked' : 'unchecked'}
                        onPress={() => setFeedbackForAdmins(!feedbackForAdmins)}
                      />
                      <Text>
                        {t('control.feedback-modal.feedback-for-admin', {
                          adminEmail: appConfig.intro.program_admin_email,
                        })}
                      </Text>
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
                onPress={() => launchFeedbackEmail(appConfig, feedbackForDev, feedbackForAdmins)}>
                {t('control.feedback-modal.send-email')}
              </Button>
            </>
          )}
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

export default FeedbackModal;
