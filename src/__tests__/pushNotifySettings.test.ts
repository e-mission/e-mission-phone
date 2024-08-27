import { initPushNotify, push } from '../js/splash/pushNotifySettings';
import { clearNotifMock, getListenerList, mockPushEvent } from '../__mocks__/pushNotificationMocks';
import { markConsented } from '../js/splash/startprefs';
import { waitFor } from '@testing-library/react-native';

afterEach(() => {
  clearNotifMock();
});

describe('pushNotifySettings', () => {
  describe('initPushNotify', () => {
    it('does not set up listeners if consent not given', async () => {
      expect(getListenerList()).toStrictEqual({});
      await initPushNotify();
      expect(getListenerList()).toStrictEqual({});
    });

    it('sets up listeners if consent given', async () => {
      await markConsented();
      await initPushNotify();
      expect(getListenerList()).toStrictEqual(
        expect.objectContaining({
          notification: expect.any(Function),
          error: expect.any(Function),
          registration: expect.any(Function),
        }),
      );
    });

    it('handles visible notification', async () => {
      const InAppBrowserOpenSpy = jest.spyOn(window['cordova'].InAppBrowser, 'open');
      await initPushNotify();
      mockPushEvent('notification', {
        additionalData: {
          payload: { alert_type: 'website', spec: { url: 'https://foo.bar' } },
        },
      });
      expect(InAppBrowserOpenSpy).toHaveBeenCalledWith(
        'https://foo.bar',
        '_blank',
        'location=yes,clearcache=no,toolbar=yes,hideurlbar=yes',
      );
    });

    it('handles silent notification', async () => {
      const BEMDataCollectionHandleSilentPushSpy = jest.spyOn(
        window['cordova'].plugins.BEMDataCollection,
        'handleSilentPush',
      );
      await initPushNotify();
      const pushFinishSpy = jest.spyOn(push, 'finish');

      const NOTIF_ID = 98765;
      mockPushEvent('notification', {
        additionalData: {
          'content-available': 1,
          payload: { notId: NOTIF_ID },
        },
      });
      await waitFor(() => {
        expect(pushFinishSpy).toHaveBeenCalledWith(expect.anything(), expect.anything(), NOTIF_ID);
        expect(BEMDataCollectionHandleSilentPushSpy).toHaveBeenCalled();
      });
    });
  });
});
