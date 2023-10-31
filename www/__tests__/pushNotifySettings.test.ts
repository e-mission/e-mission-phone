import { registerPush } from '../js/splash/pushNotifySettings';
import { mockPushNotification, getOnList, clearNotifMock } from '../__mocks__/pushNotificationMocks';

mockPushNotification();

it('registers for notifications, updates user', () => {
  registerPush();
  expect(getOnList()['notification']).toBeTruthy();
  expect(getOnList()['registration']).toBeTruthy();
  expect(getOnList()['error']).toBeTruthy();
})