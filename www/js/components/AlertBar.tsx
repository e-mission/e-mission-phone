/* Provides a global context for alerts to show as SnackBars ('toasts') at the bottom of the screen.
 Alerts can be added to the queue from anywhere by calling Alerts.addMessage. */

import React, { useState, useEffect, ComponentProps } from 'react';
import { Modal, ModalProps, ScrollView, useWindowDimensions } from 'react-native';
import { Button, Dialog, Portal, Snackbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { ParseKeys } from 'i18next';

type Message = {
  msgKey?: ParseKeys<'translation'>;
  text?: string;
  duration?: number;
  style?: object;
  alertType: 'message';
};

type AlertModal = React.ComponentType<Omit<ModalProps, 'children'>>;

export type Popup<T extends AlertModal = AlertModal> = {
  Modal?: T;
  modalProps?: Omit<ComponentProps<T>, 'visible' | 'onDismiss' | 'children'>;
  title?: string;
  content?: React.ReactNode;
  alertType: 'popup';
};

type Alert = (Message | Popup) & { alertType?: 'message' | 'popup' };

let alertListener: ((alert: Alert) => void) | undefined;

export const Alerts = {
  addMessage: (message: Omit<Message, 'alertType'>) => {
    alertListener?.({ ...message, alertType: 'message' });
  },
  showPopup: <T extends AlertModal>(
    popup: Omit<Popup<T>, 'alertType'> | T,
    modalProps?: Omit<ComponentProps<T>, 'visible' | 'onDismiss' | 'children'>,
  ) => {
    if (typeof popup === 'function') {
      popup = { Modal: popup, modalProps };
    }
    alertListener?.({ ...popup, alertType: 'popup' });
  },
};

const AlertBar = () => {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();

  const [messages, setMessages] = useState<Message[]>([]);
  const [popup, setPopup] = useState<Popup | null>(null);

  const onDismissSnackBar = () => setMessages(messages.slice(1));
  const onDismissModal = () => setPopup(null);

  // on init, attach a listener to Alerts so messages can be added from a global context
  useEffect(() => {
    alertListener = (alert: Alert) => {
      if (alert.alertType == 'message') {
        setMessages([...messages, alert]);
      } else if (alert.alertType === 'popup') {
        setPopup(alert);
      }
    };
    return () => {
      alertListener = undefined;
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
        <Modal visible={true} onDismiss={onDismissModal} style={{ margin: 0 }} transparent={true}>
          <Dialog visible={true} onDismiss={onDismissModal} style={{ margin: 0 }}>
            {popup.title && <Dialog.Title>{popup.title}</Dialog.Title>}
            {popup.content && (
              <Dialog.Content style={{ maxHeight: windowHeight / 1.5, paddingBottom: 0 }}>
                <ScrollView>{popup.content}</ScrollView>
              </Dialog.Content>
            )}
            <Dialog.Actions>
              <Button onPress={onDismissModal}>Close</Button>
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

export default AlertBar;
