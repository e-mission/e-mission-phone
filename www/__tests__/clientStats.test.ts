import { mockBEMUserCache, mockDevice, mockGetAppVersion } from "../__mocks__/cordovaMocks";
import { addStatError, addStatEvent, addStatReading, getAppVersion, statKeys } from "../js/plugin/clientStats";

mockDevice();
// this mocks cordova-plugin-app-version, generating a "Mock App", version "1.2.3"
mockGetAppVersion();
// clientStats.ts uses BEMUserCache to store the stats, so we need to mock that too
mockBEMUserCache();
const db = window['cordova']?.plugins?.BEMUserCache;

it('gets the app version', async () => {
  const ver = await getAppVersion();
  expect(ver).toEqual('1.2.3');
});

it('stores a client stats reading', async () => {
  const reading = { a: 1, b: 2 };
  await addStatReading(statKeys.REMINDER_PREFS, reading);
  const storedMessages = await db.getAllMessages('stats/client_time', false);
  expect(storedMessages).toContainEqual({
    name: statKeys.REMINDER_PREFS,
    ts: expect.any(Number),
    reading,
    client_app_version: '1.2.3',
    client_os_version: '14.0.0'
  });
});

it('stores a client stats event', async () => {
  await addStatEvent(statKeys.BUTTON_FORCE_SYNC);
  const storedMessages = await db.getAllMessages('stats/client_nav_event', false);
  expect(storedMessages).toContainEqual({
    name: statKeys.BUTTON_FORCE_SYNC,
    ts: expect.any(Number),
    reading: null,
    client_app_version: '1.2.3',
    client_os_version: '14.0.0'
  });
});

it('stores a client stats error', async () => {
  const errorStr = 'test error';
  await addStatError(statKeys.MISSING_KEYS, errorStr);
  const storedMessages = await db.getAllMessages('stats/client_error', false);
  expect(storedMessages).toContainEqual({
    name: statKeys.MISSING_KEYS,
    ts: expect.any(Number),
    reading: errorStr,
    client_app_version: '1.2.3',
    client_os_version: '14.0.0'
  });
});
