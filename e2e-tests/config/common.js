/**
 * get Device Name from script
 * @param platform iOS or Android
 */
const getDeviceName = (platform) => {
  const deviceName = process.argv.find((arg) => arg.includes('--deviceName'));
  const defaultDeviceName = platform === 'iOS' ? 'iPhone 13' : 'Pixel 3a API 33';
  return deviceName ? deviceName.split('=')[1] : defaultDeviceName;
};

/**
 * get Platform Version from script
 * @param platform iOS or Android
 */
const getPlatformVersion = (platform) => {
  const platformVersion = process.argv.find((arg) => arg.includes('--platformVersion'));
  const defaultPlatformVersion = platform === 'iOS' ? '15.0' : '13';
  return platformVersion ? platformVersion.split('=')[1] : defaultPlatformVersion;
};

module.exports = { getDeviceName, getPlatformVersion };
