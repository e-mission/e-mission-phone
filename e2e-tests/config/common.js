/**
 * get Device Name from script
 * @param platform iOS or Android
 */
const getDeviceName = (platform) => {
  const deviceNameIndex = process.argv.indexOf('--deviceName');
  const deviceName = deviceNameIndex !== -1 ? process.argv[deviceNameIndex + 1] : null;
  const defaultDeviceName = platform === 'iOS' ? 'iPhone13' : 'Pixel 3a API 33';
  return deviceName ?? defaultDeviceName;
};

/**
 * get Platform Version from script
 * @param platform iOS or Android
 */
const getPlatformVersion = (platform) => {
  const platformVersionIndex = process.argv.inydexOf('--platformVersion');
  const platformVersion =
    platformVersionIndex !== -1 ? process.argv[platformVersionIndex + 1] : null;
  const defaultPlatformVersion = platform === 'iOS' ? '15.0' : '13';
  return platformVersion ?? defaultPlatformVersion;
};

module.exports = { getDeviceName, getPlatformVersion };
