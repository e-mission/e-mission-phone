import { EVENT_NAMES, publish } from '../js/customEventHandler';
import { initRemoteNotifyHandler } from '../js/splash/remoteNotifyHandler';
import { mockBEMUserCache, mockDevice, mockGetAppVersion } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';

mockLogger();
mockDevice();
mockBEMUserCache();
mockGetAppVersion();

const db = window['cordova']?.plugins?.BEMUserCache;

it('does not adds a statEvent if not subscribed', async () => {
  publish(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, 'test data');
  const storedMessages = await db.getAllMessages('stats/client_nav_event', false);
  expect(storedMessages).toEqual([]);
});

it('adds a statEvent if subscribed', async () => {
  initRemoteNotifyHandler();
  await new Promise((r) => setTimeout(r, 500)); //wait for subscription
  publish(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, 'test data');
  await new Promise((r) => setTimeout(r, 500)); //wait for event handling
  const storedMessages = await db.getAllMessages('stats/client_nav_event', false);
  expect(storedMessages).toContainEqual({
    name: 'notification_open',
    ts: expect.any(Number),
    reading: null,
    client_app_version: '1.2.3',
    client_os_version: '14.0.0',
  });
});

