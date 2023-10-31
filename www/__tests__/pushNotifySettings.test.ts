import { registerPush } from '../js/splash/pushNotifySettings';
import { mockCordova } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import { mockPushNotification, getOnList, clearNotifMock, fakeEvent } from '../__mocks__/pushNotificationMocks';

mockPushNotification();
mockCordova();
mockLogger();

it('registers for notifications, updates user', () => {
  registerPush();
  expect(getOnList()['notification']).toBeTruthy();
  expect(getOnList()['registration']).toBeTruthy();
  expect(getOnList()['error']).toBeTruthy();

  fakeEvent('notification');
})