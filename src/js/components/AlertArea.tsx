/* Provides a global context for alerts to show as SnackBars ('toasts') at the bottom of the screen.
 Alerts can be added to the queue from anywhere by calling Alerts.addMessage. */

import React, { useState, useLayoutEffect } from 'react';
import { Modal, ScrollView, useWindowDimensions } from 'react-native';
import { Button, Dialog, Portal, Snackbar, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Alert, Message, Popup, setAlertListener } from './alerts';
import { emailErrorReport } from '../services/shareLocalDBFile';

export { Alerts } from './alerts';
export type { Popup } from './alerts';

const AlertArea = () => {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();

  const [messages, setMessages] = useState<Message[]>([]);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [isEmailing, setIsEmailing] = useState(false);
  const [reportFailure, setReportFailure] = useState('');

  const onDismissSnackBar = () => setMessages(messages.slice(1));
  const onDismissModal = () => {
    if (!isEmailing) setPopup(null);
  };

  const onEmailError = async () => {
    if (!popup?.reportError || typeof popup.content !== 'string' || isEmailing) return;
    setIsEmailing(true);
    setReportFailure('');
    try {
      await emailErrorReport(popup.title || 'Error', popup.content);
    } catch (error) {
      setReportFailure(error instanceof Error ? error.message : t('error-report.email-failed'));
    } finally {
      setIsEmailing(false);
    }
  };

  // on init, attach a listener to Alerts so messages can be added from a global context
  useLayoutEffect(() => {
    setAlertListener((alert: Alert) => {
      if (alert.alertType == 'message') {
        setMessages([...messages, alert]);
      } else if (alert.alertType === 'popup') {
        setReportFailure('');
        setPopup(alert);
      }
    });
    return () => {
      setAlertListener(undefined);
    };
  }, []);

  let snackbar;
  if (messages.length) {
    const { msgKey, text } = messages[0];
    const alertText = [msgKey && t(msgKey), text].filter((x) => x).join(' ');
    snackbar = (
      <Snackbar
        visible={true}
        onDismiss={onDismissSnackBar}
        duration={messages[0].duration}
        style={messages[0].style}
        action={{
          label: t('join.close'),
          onPress: onDismissSnackBar,
        }}>
        {alertText}
      </Snackbar>
    );
  }

  let modal;
  console.debug({ popup });
  if (popup) {
    if (popup.Modal) {
      modal = <popup.Modal visible={true} onDismiss={onDismissModal} {...popup.modalProps} />;
    } else {
      modal = (
        <Modal
          visible={true}
          onDismiss={onDismissModal}
          onRequestClose={onDismissModal}
          style={{ margin: 0 }}
          transparent={true}>
          <Dialog
            visible={true}
            onDismiss={onDismissModal}
            dismissable={!isEmailing}
            style={{ margin: 0 }}>
            {popup.title && <Dialog.Title>{popup.title}</Dialog.Title>}
            {popup.content && (
              <Dialog.Content style={{ maxHeight: windowHeight / 1.5, paddingBottom: 0 }}>
                <ScrollView>
                  {typeof popup.content == 'string' ? <Text>{popup.content}</Text> : popup.content}
                  {reportFailure ? <Text accessibilityRole="alert">{reportFailure}</Text> : null}
                </ScrollView>
              </Dialog.Content>
            )}
            <Dialog.Actions>
              <Button disabled={isEmailing} onPress={onDismissModal}>
                Close
              </Button>
              {popup.reportError && typeof popup.content === 'string' && (
                <Button
                  icon="email-outline"
                  loading={isEmailing}
                  disabled={isEmailing}
                  onPress={onEmailError}>
                  {t('error-report.email-logs')}
                </Button>
              )}
            </Dialog.Actions>
          </Dialog>
        </Modal>
      );
    }
  }

  if (snackbar || modal) {
    return (
      <Portal>
        {snackbar}
        {modal}
      </Portal>
    );
  }
};

export default AlertArea;
