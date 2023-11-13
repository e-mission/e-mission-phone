import React, { useEffect, useState } from 'react';
import i18next from "i18next";
import { logInfo, logDebug, displayError } from "../plugin/logger";
//import 'cordova-plugin-email-composer';


// Separated functions here

/*
function getEmailConfig() {
  return new Promise(async (resolve, reject) => {
    try {
      logInfo("About to get email config");
      let url = "json/emailConfig.json";
      let response = await fetch(url);
      let emailConfigData = await response.json();
      logDebug("emailConfigString = " + JSON.stringify(emailConfigData.address));
      resolve(emailConfigData.address);
    } catch (err) {
      try {
        let url = "json/emailConfig.json.sample";
        let response = await fetch(url);
        let emailConfigData = await response.json();
        logDebug("default emailConfigString = " + JSON.stringify(emailConfigData.address));
        resolve(emailConfigData.address);
      } catch (err) {
        displayError(err, "Error while reading default email config");
        reject(err);
      }
    }
  });
}
*/

async function hasAccount(): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    window['cordova'].plugins['email'].hasAccount(hasAct => {
      resolve(hasAct);
    });
  });
}

export async function sendEmail(database: string) {
  let parentDir = "unknown";

  if (window['ionic'].Platform.isIOS() && !(await hasAccount())) { //check in iOS for configuration of email thingy
    alert(i18next.t('email-service.email-account-not-configured'));
    return;
  }

  if (window['ionic'].Platform.isAndroid()) {
    parentDir = "app://databases";
  }

  if (window['ionic'].Platform.isIOS()) {
    alert(i18next.t('email-service.email-account-mail-app'));
    console.log(window['cordova'].file.dataDirectory);
    parentDir = window['cordova'].file.dataDirectory + "../LocalDatabase";
  }

  if (parentDir === 'unknown') {
    alert('parentDir unexpectedly = ' + parentDir + '!');
  }

  logInfo('Going to email ' + database);
  parentDir = parentDir + '/' + database;

  alert(i18next.t('email-service.going-to-email', { parentDir: parentDir }));

  let emailConfig = `nseptank@nrel.gov`; //remember to change it to Shankari's

  let emailData = {
    to: emailConfig,
    attachments: [parentDir],
    subject: i18next.t('email-service.email-log.subject-logs'),
    body: i18next.t('email-service.email-log.body-please-fill-in-what-is-wrong')
  };

  window['cordova'].plugins['email'].open(emailData, () => {
    logInfo('Email app closed while sending, ' + JSON.stringify(emailData) + ' not sure if we should do anything');
  });
}

/*
function EmailHelper() {
  const [emailConfig, setEmailConfig];

  useEffect(() => {
  }, [emailConfig]);



// My export component here
  return (
    <div>
      <button onClick={() => sendEmail}>
        Send Email //make sure this is from the translate thingy
      </button>
    </div>
  );

}

export default EmailHelper; //maybe this is a good option qmark - I think so?
*/