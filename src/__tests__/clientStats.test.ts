import { addStatError, addStatReading, getAppVersion } from '../js/plugin/clientStats';

const db = window['cordova']?.plugins?.BEMUserCache;

it('gets the app version', async () => {
  const ver = await getAppVersion();
  expect(ver).toEqual('1.2.3');
});

it('stores a client stats reading', async () => {
  const reading = { a: 1, b: 2 };
  await addStatReading('set_reminder_prefs', reading);
  const storedMessages = await db.getAllMessages('stats/client_time', false);
  expect(storedMessages).toContainEqual({
    name: 'set_reminder_prefs',
    ts: expect.any(Number),
    reading,
    client_app_version: '1.2.3',
    client_os_version: '14.0.0',
  });
});

it('stores a client stats event', async () => {
  await addStatReading('force_sync');
  const storedMessages = await db.getAllMessages('stats/client_time', false);
  expect(storedMessages).toContainEqual({
    name: 'force_sync',
    ts: expect.any(Number),
    reading: null,
    client_app_version: '1.2.3',
    client_os_version: '14.0.0',
  });
});

it('stores a client stats error', async () => {
  const errorStr = 'test error';
  try {
    throw new Error(errorStr);
  } catch (error) {
    await addStatError(error.message);
  }
  const storedMessages = await db.getAllMessages('stats/client_error', false);
  expect(storedMessages).toContainEqual({
    name: 'ui_error',
    ts: expect.any(Number),
    reading: errorStr,
    client_app_version: '1.2.3',
    client_os_version: '14.0.0',
  });
});
