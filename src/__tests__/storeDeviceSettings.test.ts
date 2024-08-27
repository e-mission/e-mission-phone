import { getDeviceSettings } from '../js/splash/storeDeviceSettings';

describe('storeDeviceSettings', () => {
  describe('getDeviceSettings', () => {
    it('should return device settings', async () => {
      const deviceSettings = await getDeviceSettings();
      expect(deviceSettings).toMatchObject({
        phone_lang: 'en',
        curr_platform: 'ios',
        manufacturer: 'Apple',
        client_os_version: '14.0.0',
        client_app_version: '1.2.3',
      });
    });
  });
});
