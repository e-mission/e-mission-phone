import { EVENT_NAMES, publish } from '../js/customEventHandler';
import { initRemoteNotifyHandler } from '../js/splash/remoteNotifyHandler';
import {
  clearURL,
  getURL,
  mockBEMUserCache,
  mockDevice,
  mockGetAppVersion,
  mockInAppBrowser,
} from '../__mocks__/cordovaMocks';
import { clearAlerts, getAlerts, mockAlert, mockLogger } from '../__mocks__/globalMocks';

mockLogger();
mockDevice();
mockBEMUserCache();
mockGetAppVersion();
mockInAppBrowser();
mockAlert();

const db = window['cordova']?.plugins?.BEMUserCache;

beforeEach(() => {
  clearURL();
  clearAlerts();
});

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

it('handles the url if subscribed', () => {
  initRemoteNotifyHandler();
  publish(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, {
    additionalData: {
      payload: { alert_type: 'website', spec: { url: 'https://this_is_a_test.com' } },
    },
  });
  expect(getURL()).toBe('https://this_is_a_test.com');
});

it('handles the popup if subscribed', () => {
  initRemoteNotifyHandler();
  publish(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, {
    additionalData: {
      payload: {
        alert_type: 'popup',
        spec: { title: 'Hello', text: 'World' },
      },
    },
  });
  expect(getAlerts()).toEqual(expect.arrayContaining(['━━━━\nHello\n━━━━\nWorld']));
});

it('does nothing if subscribed and no data', () => {
  initRemoteNotifyHandler();
  publish(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, {});
  expect(getURL()).toEqual('');
  expect(getAlerts()).toEqual([]);
});
