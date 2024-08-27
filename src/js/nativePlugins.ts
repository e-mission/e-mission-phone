import { Platform } from 'react-native';
import { DOMParser } from 'react-native-html-parser';
import {
  mockLogger,
  mockBEMDataCollection,
  mockBEMServerCom,
  mockBEMUserCache,
  mockDevice,
  mockGetAppVersion,
  mockOPCodeAuth,
} from '../__mocks__/cordovaMocks';

// If true, we are running in a Cordova app; plugins will be available
// If false, we are running in a standalone browser and should mock the Cordova plugins
export const IS_CORDOVA = window['cordova'] != undefined;

// As of Apr 2026, this is always true, but likely useful later
// For Cordova app, we are running Expo web in the Cordova webview
// For standalone web we are running Expo web in a browser
export const IS_WEB = Platform.OS == 'web';

function mockNativeForWeb() {
  // fill in a few browser APIs that are missing in the Expo environment
  global.DOMParser = DOMParser;

  // now we need to handle the cordova plugins
  mockLogger();
  mockDevice();
  mockGetAppVersion();
  mockBEMUserCache();
  mockBEMServerCom();
  mockBEMDataCollection();
  mockOPCodeAuth();
}

/* For Cordova, 'deviceready' means that Cordova plugins are loaded and ready to access.
    https://cordova.apache.org/docs/en/5.0.0/cordova/events/events.deviceready.html
  We wrap this event in a promise and await it before attempting to update the config,
  since loading the config requires accessing native storage through plugins. */
export let pluginsReadyPromise: Promise<any>;
if (IS_CORDOVA) {
  pluginsReadyPromise = new Promise((resolve) => {
    document.addEventListener('deviceready', resolve);
  });
} else {
  mockNativeForWeb();
  pluginsReadyPromise = Promise.resolve();
}
