const { config } = require('./wdio.conf');

// Appium capabilities
config.capabilities = [
  {
    // The defaults you need to have in your config
    platformName: 'iOS',
    maxInstances: 1,
    // For W3C the appium capabilities need to have an extension prefix
    // This is `appium:` for all Appium Capabilities which can be found here
    // http://appium.io/docs/en/writing-running-appium/caps/
    'appium:deviceName': 'iPhone 13',
    'appium:platformVersion': '15.0',
    'appium:automationName': 'XCUITest',
    'appium:app': 'edu.berkeley.eecs.emission.devapp',
  },
];

exports.config = config;
