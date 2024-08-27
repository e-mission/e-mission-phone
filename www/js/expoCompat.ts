import { Platform } from 'react-native';
import { osName, osVersion } from 'expo-device';
import { DOMParser } from 'react-native-html-parser';
import { mockLogger } from '../__mocks__/globalMocks';
import {
  mockBEMDataCollection,
  mockBEMServerCom,
  mockBEMUserCache,
  mockDevice,
  mockGetAppVersion,
} from '../__mocks__/cordovaMocks';

// osName is only defined in Expo environments; false in Cordova
export const IS_EXPO = osName != undefined;

export function setupExpoCompat() {
  if (IS_EXPO) {
    // fill in a few browser APIs that are missing in the Expo environment
    global.DOMParser = DOMParser;

    // now we need to handle the cordova plugins
    if (Platform.OS == 'web') {
      // if on Expo Web, use mocks for the plugins to enable testing in the browser
      mockLogger();
      mockDevice();
      mockGetAppVersion();
      mockBEMUserCache();
      mockBEMServerCom();
      mockBEMDataCollection();
    }
  }
}
