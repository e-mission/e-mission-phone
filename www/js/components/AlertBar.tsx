/* Provides a global context for alerts to show as SnackBars ('toasts') at the bottom of the screen.
 Alerts can be added to the queue from anywhere by calling AlertManager.addMessage. */

import React, { useState, useEffect } from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { ParseKeys } from 'i18next';

type AlertMessage = {
  msgKey?: ParseKeys<'translation'>;
  text?: string;
  duration?: number;
  style?: object;
};

// public static AlertManager that can add messages from a global context
export class AlertManager {
  private static listener?: (msg: AlertMessage) => void;
  static setListener(listener?: (msg: AlertMessage) => void) {
    AlertManager.listener = listener;
  }
  static addMessage(msg: AlertMessage) {
    AlertManager.listener?.(msg);
  }
}

const AlertBar = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AlertMessage[]>([]);
  const onDismissSnackBar = () => setMessages(messages.slice(1));

  // on init, attach a listener to AlertManager so messages can be added from a global context
  useEffect(() => {
    AlertManager.setListener((msg) => {
      setMessages([...messages, msg]);
    });
    return () => AlertManager.setListener(undefined);
  }, []);

  if (!messages.length) return null;
  const { msgKey, text } = messages[0];
  const alertText = [msgKey && t(msgKey), text].filter((x) => x).join(' ');
  return (
    <Portal>
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
    </Portal>
  );
};

export default AlertBar;
