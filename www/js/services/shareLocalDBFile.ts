import i18next from 'i18next';
import { displayErrorMsg, logDebug, logInfo, logWarn } from '../plugin/logger';

export async function sendLocalDBFile(database: string) {
  let parentDir = 'unknown';

  if (window['cordova'].platformId == 'android') {
    parentDir = 'app://databases';
    logInfo('Going to email ' + database);

    parentDir = parentDir + '/' + database;

    const emailData = {
      to: 'k.shankari@nrel.gov',
      attachments: [parentDir],
      subject: i18next.t('shareFile-service.send-log.body-please-fill-in-what-is-wrong'),
      body: i18next.t('shareFile-service.send-log.subject-logs'),
    };

    alert(i18next.t('shareFile-service.send-to'));

    // Gmail app has issues attatching `loggerDB` file when using the `socialSharing`
    // plugin.  As such, we'll keep using this plugin for Android - since GMail is
    // the default on Android, we want to support this!
    window['cordova'].plugins['email'].open(emailData, () => {
      logWarn(`Email app closed while sending, 
        emailData = ${JSON.stringify(emailData)}`);
    });
  }

  if (window['cordova'].platformId == 'ios') {
    logDebug(window['cordova'].file.dataDirectory);
    parentDir = window['cordova'].file.dataDirectory + '../LocalDatabase';

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

  if (parentDir == 'unknown') {
    displayErrorMsg('parentDir unexpectedly = ' + parentDir + '!');
    return;
  }
}
