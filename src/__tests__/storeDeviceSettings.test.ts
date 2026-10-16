import packageJson from '../../package.json';
import { getDeviceSettings } from '../js/splash/storeDeviceSettings';
import { Alerts } from '../js/components/alerts';

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

    it('rejects without opening a popup when device settings cannot be read', async () => {
      const error = new Error('App version unavailable');
      const getVersion = jest
        .spyOn(window['cordova'].getAppVersion, 'getVersionNumber')
        .mockRejectedValueOnce(error);
      const showPopup = jest.spyOn(Alerts, 'showPopup');
      try {
        await expect(getDeviceSettings()).rejects.toBe(error);
        expect(showPopup).not.toHaveBeenCalled();
      } finally {
        getVersion.mockRestore();
        showPopup.mockRestore();
      }
    });
  });
});
