import { EVENTS, publish } from '../js/customEventHandler';
import { initRemoteNotifyHandler } from '../js/splash/remoteNotifyHandler';
import { alerts, clearURL, getURL } from '../__mocks__/cordovaMocks';

const db = window['cordova']?.plugins?.BEMUserCache;

beforeEach(() => {
  clearURL();
  alerts.length = 0;
});

it('does not adds a statEvent if not subscribed', async () => {
  publish(EVENTS.CLOUD_NOTIFICATION_EVENT, 'test data');
  const storedMessages = await db.getAllMessages('stats/client_time', false);
  expect(storedMessages).toEqual([]);
});

it('adds a statEvent if subscribed', async () => {
  initRemoteNotifyHandler();
  await new Promise((r) => setTimeout(r, 500)); //wait for subscription
  publish(EVENTS.CLOUD_NOTIFICATION_EVENT, 'test data');
  await new Promise((r) => setTimeout(r, 500)); //wait for event handling
  const storedMessages = await db.getAllMessages('stats/client_time', false);
  expect(storedMessages).toContainEqual({
    name: 'open_notification',
    ts: expect.any(Number),
    reading: 'test data',
    client_app_version: '1.2.3',
    client_os_version: '14.0.0',
  });
});

it('handles the url if subscribed', () => {
  initRemoteNotifyHandler();
  publish(EVENTS.CLOUD_NOTIFICATION_EVENT, {
    additionalData: {
      payload: { alert_type: 'website', spec: { url: 'https://this_is_a_test.com' } },
    },
  });
  expect(getURL()).toBe('https://this_is_a_test.com');
});

it('handles the popup if subscribed', () => {
  initRemoteNotifyHandler();
  publish(EVENTS.CLOUD_NOTIFICATION_EVENT, {
    additionalData: {
      payload: {
        alert_type: 'popup',
        spec: { title: 'Hello', text: 'World' },
      },
    },
  });
  expect(alerts).toEqual(expect.arrayContaining(['Hello World']));
});

it('does nothing if subscribed and no data', () => {
  initRemoteNotifyHandler();
  publish(EVENTS.CLOUD_NOTIFICATION_EVENT, {});
  expect(getURL()).toEqual('');
  expect(alerts).toEqual([]);
});
