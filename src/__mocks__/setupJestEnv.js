/*
  Applies mocks to the global (window) object for use in tests.
  This is run before all of the tests are run, so these mocks are available in all tests.
*/
import { mockNativeForWeb } from '../js/nativePlugins';

// init i18next so phone_lang is set correctly during tests
import initializedI18next from '../js/i18nextInit';
window['i18next'] = initializedI18next;

mockNativeForWeb();

// empty mocks to prevent "missing asset" in test environment
// https://github.com/expo/expo/issues/21434
jest.mock('expo-font');
jest.mock('expo-asset');
