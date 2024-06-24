import i18next from 'i18next';
import { displayErrorMsg, logDebug, logInfo, logWarn } from '../plugin/logger';

export async function sendLocalDBFile(database: string) {
  let parentDir = 'unknown';

  if (window['cordova'].platformId == 'android') {
    parentDir = 'app://databases';
  }

  if (window['cordova'].platformId == 'ios') {
    logDebug(window['cordova'].file.dataDirectory);
    parentDir = window['cordova'].file.dataDirectory + '../LocalDatabase';
  }

  if (parentDir == 'unknown') {
    displayErrorMsg('parentDir unexpectedly = ' + parentDir + '!');
    return;
  }

  logInfo('Going to email ' + database);
  parentDir = parentDir + '/' + database;

  const shareObj = {
    files: [parentDir],
    message: i18next.t('shareFile-service.send-log.body-please-fill-in-what-is-wrong'),
    subject: i18next.t('shareFile-service.send-log.subject-logs'),
  };

  alert(i18next.t('shareFile-service.send-to'));
  window['plugins'].socialsharing.shareWithOptions(
    shareObj,
    (result) => {
      logDebug(`Shared to app:  ${result.app}`);
    },
    (err) => {
      logWarn(`Sharing failed with error: ${err}`);
    },
  );
}
