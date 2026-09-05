import packageJson from '../../package.json';
import { getDeviceSettings } from '../js/splash/storeDeviceSettings';

describe('storeDeviceSettings', () => {
  describe('getDeviceSettings', () => {
    it('should return device settings', async () => {
      const deviceSettings = await getDeviceSettings();
      expect(deviceSettings).toMatchObject({
        phone_lang: 'en',
        curr_platform: 'web',
        manufacturer: 'UNKNOWN',
        client_os_version: '0.0.0',
        client_app_version: packageJson.version,
      });
    });
  });
});
