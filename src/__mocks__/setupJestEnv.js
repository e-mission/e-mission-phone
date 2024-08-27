/*
  Applies mocks to the global (window) object for use in tests.
  This is run before all of the tests are run, so these mocks are available in all tests.
*/

import {
  mockBEMDataCollection,
  mockBEMServerCom,
  mockBEMUserCache,
  mockCordova,
  mockDevice,
  mockFile,
  mockGetAppVersion,
  mockInAppBrowser,
  mockLogger,
  mockReminders,
} from './cordovaMocks';
import { mockFileSystem } from './fileSystemMocks';
import { mockPushNotification } from './pushNotificationMocks';

// init i18next so phone_lang is set correctly during tests
import initializedI18next from '../js/i18nextInit';
window['i18next'] = initializedI18next;

mockLogger();
mockCordova();
mockDevice();
mockGetAppVersion();
mockBEMUserCache();
mockBEMDataCollection();
mockBEMServerCom();
mockFile();
mockFileSystem();
mockInAppBrowser();
mockPushNotification();
mockReminders();
