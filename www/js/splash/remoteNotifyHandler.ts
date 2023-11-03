//naming of this module can be confusing "remotenotifyhandler" for rewritten file
//https://github.com/e-mission/e-mission-phone/pull/1072#discussion_r1375360832

/*
 * This module deals with handling specific push messages that open web pages
 * or popups. It does not interface with the push plugin directly. Instead, it
 * assumes that another module (currently `pushnotify`) deals with the plugin
 * interface and emits a CLOUD_NOTIFICATION_EVENT when a push notification is
 * received.
 *
 * This allows us to decouple the push handling logic from push notification
 * interface. Note that the local notification is not currently decoupled since
 * it only supports redirection to a specific app page. If the local
 * notification handling gets more complex, we should consider decoupling it as well.
 */
'use strict';

import { EVENT_NAMES, subscribe } from '../customEventHandler';
import { addStatEvent, statKeys } from '../plugin/clientStats';
import { displayErrorMsg, logDebug } from '../plugin/logger';

const options = 'location=yes,clearcache=no,toolbar=yes,hideurlbar=yes';

/*
     TODO: Potentially unify with the survey URL loading
     */
const launchWebpage = function (url) {
  // THIS LINE FOR inAppBrowser
  let iab = window['cordova'].InAppBrowser.open(url, '_blank', options);
};

const launchPopup = function (title, text) {
  // THIS LINE FOR inAppBrowser
  displayErrorMsg(text, title);
};

const onCloudNotifEvent = (event) => {
  const data = event.detail;
  addStatEvent(statKeys.NOTIFICATION_OPEN).then(() => {
    console.log('Added ' + statKeys.NOTIFICATION_OPEN + ' event. Data = ' + JSON.stringify(data));
  });
  logDebug('data = ' + JSON.stringify(data));
  if (
    data.additionalData &&
    data.additionalData.payload &&
    data.additionalData.payload.alert_type
  ) {
    if (data.additionalData.payload.alert_type == 'website') {
      var webpage_spec = data.additionalData.payload.spec;
      if (webpage_spec && webpage_spec.url && webpage_spec.url.startsWith('https://')) {
        launchWebpage(webpage_spec.url);
      } else {
        displayErrorMsg(
          JSON.stringify(webpage_spec),
          'webpage was not specified correctly. spec is ',
        );
      }
    }
    if (data.additionalData.payload.alert_type == 'popup') {
      var popup_spec = data.additionalData.payload.spec;
      if (popup_spec && popup_spec.title && popup_spec.text) {
        launchPopup(popup_spec.title, popup_spec.text);
      } else {
        displayErrorMsg(JSON.stringify(popup_spec), 'popup was not specified correctly. spec is ');
      }
    }
  }
};

export const initRemoteNotifyHandler = function () {
  subscribe(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, onCloudNotifEvent);
};
