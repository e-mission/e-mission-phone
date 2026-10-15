/* Global entry point for showing alerts (snackbar 'toasts' and popups).
 Kept free of UI imports so it can be used from non-React modules (loggers, services, etc.)
 Text alerts render in AlertArea; custom modals render in AppModalHost inside app context. */

import { ComponentProps } from 'react';
import type { ModalProps } from 'react-native';
import { ParseKeys } from 'i18next';

export type Message = {
  msgKey?: ParseKeys<'translation'>;
  text?: string;
  duration?: number;
  style?: object;
  alertType: 'message';
};

export type AlertModal = React.ComponentType<Omit<ModalProps, 'children'>>;

export type Popup<T extends AlertModal = AlertModal> = {
  Modal?: T;
  modalProps?: Omit<ComponentProps<T>, 'visible' | 'onDismiss' | 'children'>;
  title?: string;
  content?: React.ReactNode;
  reportError?: boolean;
  alertType: 'popup';
};

export type Alert = (Message | Popup) & { alertType?: 'message' | 'popup' };

let alertListener: ((alert: Alert) => void) | undefined;
let appModalListener: ((popup: Popup) => void) | undefined;

export const setAlertListener = (listener?: (alert: Alert) => void) => {
  alertListener = listener;
};

export const setAppModalListener = (listener?: (popup: Popup) => void) => {
  appModalListener = listener;
};

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
    const listener = popup.Modal ? appModalListener : alertListener;
    listener?.({ ...popup, alertType: 'popup' });
  },
};
