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
import { EVENTS, subscribe } from '../customEventHandler';
import { addStatReading } from '../plugin/clientStats';
import { displayErrorMsg, logDebug } from '../plugin/logger';

const options = 'location=yes,clearcache=no,toolbar=yes,hideurlbar=yes';

/*
TODO: Potentially unify with the survey URL loading
*/
/**
 * @function launches a webpage
 * @param url to open in the browser
 */
const launchWebpage = (url) => window['cordova'].InAppBrowser.open(url, '_blank', options);

/**
 * @description callback for cloud notification event
 * @param event that triggered this call
 */
function onCloudNotifEvent(event) {
  const data = event.detail;
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
 * @function initializes the remote notification handling
 * subscribes to cloud notification event
 */
export function initRemoteNotifyHandler() {
  subscribe(EVENTS.CLOUD_NOTIFICATION_EVENT, onCloudNotifEvent);
}
