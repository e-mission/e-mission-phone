import * as commHelper from '../js/services/commHelper';
import { registerAndUpdateProfile, updateUserProfile, UserProfile } from '../js/splash/userProfile';

describe('userProfile', () => {
  const getUserSpy = jest.spyOn(commHelper, 'getUser');
  const updateUserSpy = jest.spyOn(commHelper, 'updateUser');

  const currProfile = {
    config_version: 2,
    phone_lang: 'en',
    curr_platform: 'ios',
    manufacturer: 'Apple',
    client_os_version: '14.0.0',
    client_app_version: '1.2.3',
    device_token: 'abc123',
    curr_sync_interval: 60,
  } as UserProfile;

  jest.spyOn(commHelper, 'getUser').mockResolvedValue(currProfile);

  describe('updateUserProfile', () => {
    it('should update user profile if there are changes', async () => {
      const profileUpdate = {
        phone_lang: 'fr',
      };

      const result = await updateUserProfile(profileUpdate, currProfile);
      expect(getUserSpy).not.toHaveBeenCalled();
      expect(updateUserSpy).toHaveBeenCalled();
      expect(result).toMatchObject({
        ...currProfile,
        ...profileUpdate,
      });
      updateUserSpy.mockClear();
    });

    it('should not update user profile if there are no changes', async () => {
      const profileUpdate = {
        phone_lang: 'en',
      };

      const result = await updateUserProfile(profileUpdate, currProfile);
      expect(getUserSpy).not.toHaveBeenCalled();
      expect(updateUserSpy).not.toHaveBeenCalled();
      expect(result).toMatchObject(currProfile);
      updateUserSpy.mockClear();
    });

    it('should get user profile if currProfile arg was omitted', async () => {
      const profileUpdate = {
        phone_lang: 'es',
      };

      const result = await updateUserProfile(profileUpdate, undefined);
      expect(getUserSpy).toHaveBeenCalled();
      expect(updateUserSpy).toHaveBeenCalled();
      expect(result).toMatchObject({
        ...currProfile,
        ...profileUpdate,
      });
      updateUserSpy.mockClear();
    });
  });

  describe('registerAndUpdateProfile', () => {
    it('should register and update user profile with push notification and device settings', async () => {
      const appConfig = { version: 3 } as any;

      const result = await registerAndUpdateProfile(appConfig);
      expect(getUserSpy).toHaveBeenCalled();
      expect(updateUserSpy).toHaveBeenCalled();
      expect(result).toMatchObject({
        ...currProfile,
        config_version: appConfig.version,
        device_token: expect.any(String),
        curr_sync_interval: expect.any(Number),
      });
    });
  });
});
