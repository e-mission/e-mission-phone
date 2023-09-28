import { mockBEMUserCache } from "../__mocks__/cordovaMocks";
import { mockLogger } from "../__mocks__/globalMocks";
import { storageClear, storageGet, storageRemove, storageSet } from "../js/plugin/storage";

// mocks used - storage.ts uses BEMUserCache and logging.
// localStorage is already mocked for us by Jest :)
mockLogger();
mockBEMUserCache();

it('stores a value and retrieves it back', async () => {
  await storageSet('test1', 'test value 1');
  const retVal = await storageGet('test1');
  expect(retVal).toEqual('test value 1');
});

it('stores a value, removes it, and checks that it is gone', async () => {
  await storageSet('test2', 'test value 2');
  await storageRemove('test2');
  const retVal = await storageGet('test2');
  expect(retVal).toBeUndefined();
});

it('can store objects too', async () => {
  const obj = { a: 1, b: 2 };
  await storageSet('test6', obj);
  const retVal = await storageGet('test6');
  expect(retVal).toEqual(obj);
});

it('can also store complex nested objects with arrays', async () => {
  const obj = { a: 1, b: { c: [1, 2, 3] } };
  await storageSet('test7', obj);
  const retVal = await storageGet('test7');
  expect(retVal).toEqual(obj);
});

it('preserves values if local gets cleared', async () => {
  await storageSet('test3', 'test value 3');
  await storageClear({ local: true });
  const retVal = await storageGet('test3');
  expect(retVal).toEqual('test value 3');
});

it('preserves values if native gets cleared', async () => {
  await storageSet('test4', 'test value 4');
  await storageClear({ native: true });
  const retVal = await storageGet('test4');
  expect(retVal).toEqual('test value 4');
});

it('does not preserve values if both local and native are cleared', async () => {
  await storageSet('test5', 'test value 5');
  await storageClear({ local: true, native: true });
  const retVal = await storageGet('test5');
  expect(retVal).toBeUndefined();
});

it('preserves values if local gets cleared, then retrieved, then native gets cleared', async () => {
  await storageSet('test8', 'test value 8');
  await storageClear({ local: true });
  await storageGet('test8');
  await storageClear({ native: true });
  const retVal = await storageGet('test8');
  expect(retVal).toEqual('test value 8');
});

it('preserves values if native gets cleared, then retrieved, then local gets cleared', async () => {
  await storageSet('test9', 'test value 9');
  await storageClear({ native: true });
  await storageGet('test9');
  await storageClear({ local: true });
  const retVal = await storageGet('test9');
  expect(retVal).toEqual('test value 9');
});
