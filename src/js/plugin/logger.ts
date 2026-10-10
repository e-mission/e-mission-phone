import { addStatError } from './clientStats';
import { Alerts } from '../components/alerts';
import i18next from 'i18next';
import { getServerErrorCode, getServerErrorMessage } from '../services/errorHandling';

export const logDebug = (message: string) =>
  window['Logger']?.log(window['Logger'].LEVEL_DEBUG, message);

export const logInfo = (message: string) =>
  window['Logger']?.log(window['Logger'].LEVEL_INFO, message);

export const logWarn = (message: string) =>
  window['Logger']?.log(window['Logger'].LEVEL_WARN, message);

export function displayError(error: unknown, title?: string, errorCodePrefix?: string) {
  const code = getServerErrorCode(error);
  const codeKey = errorCodePrefix && code ? `${errorCodePrefix}.${code}` : undefined;
  const message = getServerErrorMessage(error);
  let errorMsg =
    codeKey && i18next.exists(codeKey)
      ? `${i18next.t(codeKey, { defaultValue: message })}\n\n${message}`
      : message;
  if (!errorCodePrefix && error instanceof Error && error.stack) {
    errorMsg += '\n' + error.stack;
  }
  displayErrorMsg(errorMsg, title);
}

export function displayErrorMsg(errorMsg: string, title?: string) {
  // Check for OPcode 'Does Not Exist' errors and prepend the title with "Invalid OPcode"
  if (errorMsg.includes?.('403')) {
    title = 'Invalid OPcode: ' + (title || '');
  }
  const displayMsg = `━━━━\n${title}\n━━━━\n` + errorMsg;
  Alerts.showPopup({ title: title || 'Error', content: errorMsg });
  addStatError(title ? `${title}: ${errorMsg}` : errorMsg);
  console.error(displayMsg);
  window['Logger']?.log(window['Logger'].LEVEL_ERROR, displayMsg);
}
