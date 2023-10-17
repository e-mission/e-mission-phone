import { mockLogger } from '../__mocks__/globalMocks';
import { fetchUrlCached } from '../js/commHelper';

mockLogger();

// mock for JavaScript 'fetch'
// we emulate a 100ms delay when i) fetching data and ii) parsing it as text
global.fetch = (url: string) => new Promise((rs, rj) => {
  setTimeout(() => rs({
    text: () => new Promise((rs, rj) => {
      setTimeout(() => rs('mock data for ' + url), 100);
    })
  }));
}) as any;

it('fetches text from a URL and caches it so the next call is faster', async () => {
  const tsBeforeCalls = Date.now();
  const text1 = await fetchUrlCached('https://raw.githubusercontent.com/e-mission/e-mission-phone/master/README.md');
  const tsBetweenCalls = Date.now();
  const text2 = await fetchUrlCached('https://raw.githubusercontent.com/e-mission/e-mission-phone/master/README.md');
  const tsAfterCalls = Date.now();
  expect(text1).toEqual(expect.stringContaining('mock data'));
  expect(text2).toEqual(expect.stringContaining('mock data'));
  expect(tsAfterCalls - tsBetweenCalls).toBeLessThan(tsBetweenCalls - tsBeforeCalls);
});

/* The following functions from commHelper.ts are not tested because they are just wrappers
    around the native functions in BEMServerComm.
  If we wanted to test them, we would need to mock the native functions in BEMServerComm.
    It would be better to do integration tests that actually call the native functions.

  * - getRawEntries
  * - getRawEntriesForLocalDate
  * - getPipelineRangeTs
  * - getPipelineCompleteTs
  * - getMetrics
  * - getAggregateData
  * - registerUser
  * - updateUser
  * - getUser
  * - putOne
*/
