import { addStatError } from './clientStats';

export const logDebug = (message: string) =>
  window['Logger']?.log(window['Logger'].LEVEL_DEBUG, message);

export const logInfo = (message: string) =>
  window['Logger']?.log(window['Logger'].LEVEL_INFO, message);

export const logWarn = (message: string) =>
  window['Logger']?.log(window['Logger'].LEVEL_WARN, message);

export function displayError(error: Error, title?: string) {
  const errorMsg = error.message ? error.message + '\n' + error.stack : JSON.stringify(error);
  displayErrorMsg(errorMsg, title);
}

export function displayErrorMsg(errorMsg: string, title?: string) {
  // Check for OPcode 'Does Not Exist' errors and prepend the title with "Invalid OPcode"
  if (errorMsg.includes?.('403')) {
    title = 'Invalid OPcode: ' + (title || '');
  }
  const displayMsg = `━━━━\n${title}\n━━━━\n` + errorMsg;
  window.alert(displayMsg);
  addStatError(title ? `${title}: ${errorMsg}` : errorMsg);
  console.error(displayMsg);
  window['Logger']?.log(window['Logger'].LEVEL_ERROR, displayMsg);
}
