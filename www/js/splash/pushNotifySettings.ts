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

import { updateUser } from '../services/commHelper';
import { logDebug, displayError } from '../plugin/logger';
import { publish, subscribe, EVENTS } from '../customEventHandler';
import { isConsented, readConsentState } from './startprefs';
import { readIntroDone } from '../onboarding/onboardingHelper';

let push = null;

/**
 * @function initializes the PushNotification in window,
 * assigns on 'notification' functionality
 */
const startupInit = function () {
  push = window['PushNotification'].init({
    ios: {
      badge: true,
      sound: true,
      vibration: true,
      clearBadge: true,
    },
    android: {
      iconColor: '#008acf',
      icon: 'ic_mood_question',
      clearNotifications: true,
    },
  });
  push.on('notification', function (data) {
    if (window['cordova'].platformId == 'ios') {
      // Parse the iOS values that are returned as strings
      if (data && data.additionalData) {
        if (data.additionalData.payload) {
          data.additionalData.payload = JSON.parse(data.additionalData.payload);
        }
        if (data.additionalData.data && typeof data.additionalData.data == 'string') {
          data.additionalData.data = JSON.parse(data.additionalData.data);
        } else {
          console.log('additionalData is already an object, no need to parse it');
        }
      } else {
        logDebug('No additional data defined, nothing to parse');
      }
    }
    publish(EVENTS.CLOUD_NOTIFICATION_EVENT, data);
  });
};

/**
 * @function registers notifications and handles result
 * @returns Promise for initialization logic,
 * resolves on registration with token
 * rejects on error with error
 */
const registerPromise = function () {
  return new Promise(function (resolve, reject) {
    startupInit();
    push.on('registration', function (data) {
      console.log('Got registration ' + data);
      resolve({
        token: data.registrationId,
        type: data.registrationType,
      });
    });
    push.on('error', function (error) {
      console.log('Got push error ' + error);
      reject(error);
    });
    console.log('push notify = ' + push);
  });
};

/**
 * @function registers for notifications and updates user
 * currently called on reconsent and on intro done
 */
const registerPush = function () {
  registerPromise()
    .then(function (t) {
      logDebug('Token = ' + JSON.stringify(t));
      return window['cordova'].plugins.BEMServerSync.getConfig()
        .then(
          function (config) {
            return config.sync_interval;
          },
          function (error) {
            console.log('Got error ' + error + ' while reading config, returning default = 3600');
            return 3600;
          },
        )
        .then(function (sync_interval) {
          updateUser({
            device_token: t['token'],
            curr_platform: window['cordova'].platformId,
            curr_sync_interval: sync_interval,
          });
          return t;
        });
    })
    .then(function (t) {
      logDebug('Finished saving token = ' + JSON.stringify(t.token));
    })
    .catch(function (error) {
      displayError(error, 'Error in registering push notifications');
    });
};

/**
 * @function handles silent push notifications
 * works with BEMDataCollection plugin
 * @param data from the notification
 * @returns early if platform is not ios
 */
const redirectSilentPush = function (event, data) {
  logDebug('Found silent push notification, for platform ' + window['cordova'].platformId);
  if (window['cordova'].platformId != 'ios') {
    logDebug('Platform is not ios, handleSilentPush is not implemented or needed');
    // doesn't matter if we finish or not because platforms other than ios don't care
    return;
  }
  logDebug('Platform is ios, calling handleSilentPush on DataCollection');
  var notId = data.additionalData.payload.notId;
  var finishErrFn = function (error) {
    logDebug('in push.finish, error = ' + error);
  };

  window['cordova'].plugins.BEMDataCollection.getConfig()
    .then(function (config) {
      if (config.ios_use_remote_push_for_sync) {
        window['cordova'].plugins.BEMDataCollection.handleSilentPush().then(function () {
          logDebug('silent push finished successfully, calling push.finish');
          showDebugLocalNotification('silent push finished, calling push.finish');
          push.finish(function () {}, finishErrFn, notId);
        });
      } else {
        logDebug('Using background fetch for sync, no need to redirect push');
        push.finish(function () {}, finishErrFn, notId);
      }
    })
    .catch(function (error) {
      push.finish(function () {}, finishErrFn, notId);
      displayError(error, 'Error while redirecting silent push');
    });
};

/**
 * @function shows debug notifications if simulating user interaction
 * @param message string to display in the degug notif
 */
const showDebugLocalNotification = function (message) {
  window['cordova'].plugins.BEMDataCollection.getConfig().then(function (config) {
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
};

/**
 * @function handles pushNotification intitially
 * @param event that called this function
 * @param data from the notification
 */
const onCloudEvent = function (event, data) {
  logDebug('data = ' + JSON.stringify(data));
  if (data.additionalData['content-available'] == 1) {
    redirectSilentPush(event, data);
  } // else no need to call finish
};

/**
 * @function registers push on reconsent
 * @param event that called this function
 * @param data data from the conesnt event
 */
const onConsentEvent = function (event, data) {
  console.log(
    'got consented event ' + JSON.stringify(event['name']) + ' with data ' + JSON.stringify(data),
  );
  readIntroDone().then((isIntroDone) => {
    if (isIntroDone) {
      console.log('intro is done -> reconsent situation, we already have a token -> register');
      registerPush();
    }
  });
};

/**
 * @function registers push after intro received
 * @param event that called this function
 * @param data from the event
 */
const onIntroEvent = function (event, data) {
  console.log(
    'intro is done -> original consent situation, we should have a token by now -> register',
  );
  registerPush();
};

/**
 * startup code -
 * @function registers push if consented, subscribes event listeners for local handline
 */
export const initPushNotify = function () {
  readConsentState()
    .then(isConsented)
    .then(function (consentState) {
      if (consentState == true) {
        logDebug('already consented, signing up for remote push');
        registerPush();
      } else {
        logDebug('no consent yet, waiting to sign up for remote push');
      }
    });

  subscribe(EVENTS.CLOUD_NOTIFICATION_EVENT, (event) => onCloudEvent(event, event.detail));
  subscribe(EVENTS.CONSENTED_EVENT, (event) => onConsentEvent(event, event.detail));
  subscribe(EVENTS.INTRO_DONE_EVENT, (event) => onIntroEvent(event, event.detail));

  logDebug('pushnotify startup done');
};
