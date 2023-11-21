import i18next from 'i18next';
import { logDebug, logInfo, logWarn } from '../plugin/logger';

async function hasAccount(): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    window['cordova'].plugins['email'].hasAccount((hasAct) => {
      resolve(hasAct);
    });
  });
}

export async function sendEmail(database: string) {
  let parentDir = 'unknown';

  if (window['cordova'].platformId == 'ios' && !(await hasAccount())) {
    alert(i18next.t('email-service.email-account-not-configured'));
    return;
  }

  if (window['cordova'].platformId) == 'android') {
    parentDir = 'app://databases';
  }

  if (window['cordova'].platformId) == 'ios') {
    alert(i18next.t('email-service.email-account-mail-app'));
    logDebug(window['cordova'].file.dataDirectory);
    parentDir = window['cordova'].file.dataDirectory + '../LocalDatabase';
  }

  if (parentDir === 'unknown') {
    alert('parentDir unexpectedly = ' + parentDir + '!');
  }

  logInfo('Going to email ' + database);
  parentDir = parentDir + '/' + database;

  alert(i18next.t('email-service.going-to-email', { parentDir: parentDir }));

  let emailConfig = `k.shankari@nrel.gov`;

  let emailData = {
    to: emailConfig,
    attachments: [parentDir],
    subject: i18next.t('email-service.email-log.subject-logs'),
    body: i18next.t('email-service.email-log.body-please-fill-in-what-is-wrong'),
  };

  window['cordova'].plugins['email'].open(emailData, () => {
    logWarn(`Email app closed while sending, 
      emailData = ${JSON.stringify(emailData)}`);
  });
}
