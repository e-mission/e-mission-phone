/*
  Applies mocks to the global (window) object for use in tests.
  This is run before all of the tests are run, so these mocks are available in all tests.
*/
const { TextDecoder, TextEncoder } = require('util');
const { URL, URLSearchParams } = require('url');

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
global.URL = URL;
global.URLSearchParams = URLSearchParams;
window.TextDecoder = TextDecoder;
window.TextEncoder = TextEncoder;
window.URL = URL;
window.URLSearchParams = URLSearchParams;

const { mockNativeForWeb } = require('../js/nativePlugins');

// init i18next so phone_lang is set correctly during tests
const initializedI18next = require('../js/i18nextInit').default;
window['i18next'] = initializedI18next;

mockNativeForWeb();

// empty mocks to prevent "missing asset" in test environment
// https://github.com/expo/expo/issues/21434
jest.mock('expo-font');
jest.mock('expo-asset');
