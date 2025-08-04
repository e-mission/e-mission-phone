/*
 * This module deals with the interaction with the push plugin, the redirection
 * of silent push notifications and the re-parsing of iOS pushes. It then
 * re-emits a CLOUD_NOTIFICATION_EVENT that other modules can listen to.
 *
 * Other modules, such as the survey code, and the remotenotify module, listen
 * to these CLOUD_NOTIFICATION_EVENTs and handle them through launching
 * surveys, displaying popups, etc.
 *
 * This allows us to decouple the push handling logic from push notification
 * interface. Note that the local notification is not currently decoupled since
 * it only supports redirection to a specific app page. If the local
 * notification handling gets more complex, we should consider decoupling it as well.
 */

import { logDebug, displayError, logWarn, displayErrorMsg } from '../plugin/logger';
import { readConsentState } from './startprefs';
import { Alerts } from '../components/AlertBar';
import { addStatReading } from '../plugin/clientStats';

export let push;

const withTimeout = (promise, seconds = 10) => {
  const timeout = new Promise((rs, rj) =>
    setTimeout(() => rj(`Timed out after ${seconds} seconds`), seconds * 1000),
  );
  return Promise.race([promise, timeout]);
};

/**
 * Registers for push notifications and resolves with the token and type.
 * @returns Promise that resolves with an object containing token and type
 */
function register() {
  return new Promise<{ token: string; type: string }>((resolve, reject) => {
    push = window['PushNotification'].init({
      ios: {
        badge: true,
        sound: true,
        clearBadge: true,
        forceRegister: true,
      },
      android: {
        iconColor: '#008acf',
        icon: 'ic_mood_question',
        clearNotifications: true,
      },
    });
    push.on('registration', (data) => {
      logDebug('Got registration ' + data);
      resolve({
        token: data.registrationId,
        type: data.registrationType,
      });
    });
    push.on('error', (error) => {
      logWarn('Got push error ' + error);
      reject(error);
    });
    push.on('notification', handlePush);
    logDebug('push notify = ' + push);
  });
}

/**
 * Registers for push notifications and returns information that
 * should be stored in the user profile.
 * @returns Promise that resolves with an object of fields that should be
 * updated in the user profile (undefined if registration failed)
 */
async function registerPush() {
  logDebug('PushNotify: registering push');
  let token: string;
  try {
    const registerObj = await withTimeout(register());
    token = registerObj.token;
  } catch (error) {
    const msg = `Registering for push notifications failed: ${error}`;
    logWarn(msg);
    Alerts.addMessage({ text: msg });
    return;
  }

  logDebug('PushNotify: registered push with token = ' + token);

  let syncInterval: number;
  try {
    const config = await window['cordova'].plugins.BEMServerSync.getConfig();
    syncInterval = config.sync_interval;
  } catch (error) {
    logWarn('Got error ' + error + ' while reading config, using default sync_interval = 3600');
    syncInterval = 3600;
  }

  return {
    device_token: token,
    curr_sync_interval: syncInterval,
  };
}

function handlePush(data) {
  if (window['cordova'].platformId == 'ios') {
    // Parse the iOS values that are returned as strings
    if (data && data.additionalData) {
      if (data.additionalData.payload && typeof data.additionalData.payload == 'string') {
        data.additionalData.payload = JSON.parse(data.additionalData.payload);
      } else {
        logDebug('additionalData.payload is already an object, no need to parse it');
      }
      if (data.additionalData.data && typeof data.additionalData.data == 'string') {
        data.additionalData.data = JSON.parse(data.additionalData.data);
      } else {
        logDebug('additionalData.data is already an object, no need to parse it');
      }
    } else {
      logDebug('No additional data defined, nothing to parse');
    }
  }

  if (data.additionalData['content-available'] == 1) {
    handleSilentPush(data);
  } else {
    handleVisiblePush(data);
  }
}

/**
 * @description Handles silent push notifications by forwarding them to the
 * BEMDataCollection plugin and calls push.finish() when done (which is only
 * required on iOS for pushes with content-available=1).
 * @param data from the notification
 * @returns void; returns early if platform is not ios
 */
function handleSilentPush(data) {
  logDebug('Found silent push notification, for platform ' + window['cordova'].platformId);
  if (window['cordova'].platformId != 'ios') {
    logDebug('Platform is not ios, handleSilentPush is not implemented or needed');
    return;
  }
  logDebug('Platform is ios, calling handleSilentPush on DataCollection');
  const notId = data.additionalData.payload.notId;
  const finishErrFn = (error) => {
    logDebug('in push.finish, error = ' + error);
  };

  window['cordova'].plugins.BEMDataCollection.getConfig()
    .then((config) => {
      if (config.ios_use_remote_push_for_sync) {
        window['cordova'].plugins.BEMDataCollection.handleSilentPush().then(() => {
          logDebug('silent push finished successfully, calling push.finish');
          showDebugLocalNotification('silent push finished, calling push.finish');
          push.finish(() => {}, finishErrFn, notId);
        });
      } else {
        logDebug('Using background fetch for sync, no need to redirect push');
        push.finish(() => {}, finishErrFn, notId);
      }
    })
    .catch((error) => {
      push.finish(() => {}, finishErrFn, notId);
      displayError(error, 'Error while redirecting silent push');
    });
}

const launchWebpage = (url) =>
  window['cordova'].InAppBrowser.open(
    url,
    '_blank',
    'location=yes,clearcache=no,toolbar=yes,hideurlbar=yes',
  );

/**
 * TODO: this needs testing to see if it still works!
 * @description Handles visible push notifications by launching a webpage or displaying a popup.
 * @param data from the notification
 */
export function handleVisiblePush(data) {
  addStatReading('open_notification', data);
  logDebug('data = ' + JSON.stringify(data));
  if (
    data.additionalData &&
    data.additionalData.payload &&
    data.additionalData.payload.alert_type
  ) {
    if (data.additionalData.payload.alert_type == 'website') {
      const webpageSpec = data.additionalData.payload.spec;
      if (webpageSpec?.url?.startsWith('https://')) {
        launchWebpage(webpageSpec.url);
      } else {
        displayErrorMsg(
          JSON.stringify(webpageSpec),
          'webpage was not specified correctly. spec is ',
        );
      }
    }
    if (data.additionalData.payload.alert_type == 'popup') {
      const popupSpec = data.additionalData.payload.spec;
      if (popupSpec?.title && popupSpec?.text) {
        /* TODO: replace popup with something with better UI */
        window.alert(popupSpec.title + ' ' + popupSpec.text);
      } else {
        displayErrorMsg(JSON.stringify(popupSpec), 'popup was not specified correctly. spec is ');
      }
    }
  }
}

/**
 * @function shows debug notifications if simulating user interaction
 * @param message string to display in the degug notif
 */
function showDebugLocalNotification(message) {
  window['cordova'].plugins.BEMDataCollection.getConfig().then((config) => {
    if (config.simulate_user_interaction) {
      window['cordova'].plugins.notification.local.schedule({
        id: 1,
        title: 'Debug javascript notification',
        text: message,
        actions: [],
        category: 'SIGN_IN_TO_CLASS',
      });
    }
  });
}

export function scheduleDebugLocalNotification(millis = 5000) {
  window['cordova'].plugins.notification.local.addActions('debug-actions', [
    { id: 'action', title: 'Yes' },
    { id: 'cancel', title: 'No' },
  ]);
  window['cordova'].plugins.notification.local.schedule({
    id: new Date().getTime(),
    title: 'Debug Title',
    text: 'Debug text',
    actions: 'debug-actions',
    trigger: { at: new Date(new Date().getTime() + millis) },
  });
}

/**
 * startup code -
 * @function registers push if consented, subscribes event listeners for local handline
 */
export async function initPushNotify() {
  const consentState = await readConsentState();
  if (consentState == true) {
    logDebug('already consented, signing up for remote push');
    return registerPush();
  } else {
    logDebug('no consent yet, waiting to sign up for remote push');
  }
}
