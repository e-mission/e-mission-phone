const { config } = require('./wdio.conf');
const { join } = require('path');

config.capabilities = [
  {
    // The defaults you need to have in your config
    platformName: 'Android',
    maxInstances: 1,
    'appium:deviceName': 'Pixel 3a API 33',
    'appium:platformVersion': '13',
    'appium:automationName': 'UiAutomator2',
    'appium:app': join(process.cwd(), './apps/em-devapp-3.2.5.apk'),
  },
];

exports.config = config;
