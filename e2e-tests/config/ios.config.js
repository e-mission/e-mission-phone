const { getDeviceName, getPlatformVersion } = require('./common');
const { config } = require('./wdio.conf');
const { join } = require('path');

// Appium capabilities
config.capabilities = [
  {
    // The defaults you need to have in your config
    platformName: 'iOS',
    maxInstances: 1,
    // For W3C the appium capabilities need to have an extension prefix
    // This is `appium:` for all Appium Capabilities which can be found here
    // http://appium.io/docs/en/writing-running-appium/caps/
    'appium:deviceName': getDeviceName('iOS'),
    'appium:platformVersion': getPlatformVersion('iOS'),
    'appium:automationName': 'XCUITest',
    // it may change once we finalize our target app
    'appium:app': join(process.cwd(), './apps/em-devapp.app'),
  },
];
exports.config = config;