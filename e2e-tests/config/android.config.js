const { getDeviceName, getPlatformVersion } = require('./common');
const { config } = require('./wdio.conf');
const { join } = require('path');

config.capabilities = [
  {
    // The defaults you need to have in your config
    platformName: 'Android',
    maxInstances: 1,
    // For W3C the appium capabilities need to have an extension prefix
    // This is `appium:` for all Appium Capabilities which can be found here
    // http://appium.io/docs/en/writing-running-appium/caps/
    'appium:deviceName': getDeviceName('Android'),
    'appium:platformVersion': getPlatformVersion('Android'),
    'appium:automationName': 'UiAutomator2',
    'appium:app': join(process.cwd(), './platforms/android/app/build/outputs/apk/debug/app-debug.apk'),
  },
];

exports.config = config;
