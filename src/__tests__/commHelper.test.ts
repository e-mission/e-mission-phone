import { fetchUrlCached, getAggregateData } from '../js/services/commHelper';
import { getServerErrorMessage, withErrorContext } from '../js/services/errorHandling';
jest.mock('../js/components/alerts', () => ({ Alerts: { showPopup: jest.fn() } }));
jest.mock('../js/plugin/clientStats', () => ({ addStatError: jest.fn() }));

jest.mock('i18next', () => ({
  __esModule: true,
  default: { exists: jest.fn(), t: jest.fn() },
}));

let logger: typeof import('../js/plugin/logger');
let i18next: { exists: jest.Mock; t: jest.Mock };
let Alerts: { showPopup: jest.Mock };
let addStatError: jest.Mock;
jest.isolateModules(() => {
  logger = jest.requireActual('../js/plugin/logger');
  i18next = require('i18next').default;
  Alerts = require('../js/components/alerts').Alerts;
  addStatError = require('../js/plugin/clientStats').addStatError;
});
const { displayError, displayErrorMsg } = logger!;

it('displays translated error guidance from a configurable prefix', () => {
  (i18next.exists as jest.Mock).mockReturnValueOnce(true);
  (i18next.t as jest.Mock).mockReturnValueOnce('Choose another date range.');
  displayError(
    { status: 400, body: { code: 'INVALID_RANGE', error: 'Invalid range' } },
    'Metrics failed',
    'metrics.error-codes',
  );
  expect(i18next.exists).toHaveBeenLastCalledWith('metrics.error-codes.INVALID_RANGE');
  expect(Alerts.showPopup).toHaveBeenLastCalledWith({
    title: 'Metrics failed',
    content: 'Choose another date range.\n\n400: Invalid range',
  });
  expect(addStatError).toHaveBeenLastCalledWith(
    'Metrics failed: Choose another date range.\n\n400: Invalid range',
  );
});

it('falls back to server details when a translation is missing', () => {
  (i18next.exists as jest.Mock).mockReturnValueOnce(false);
  displayError(
    { status: 400, body: { code: 'UNKNOWN', error: 'Invalid request' } },
    'Request failed',
    'metrics.error-codes',
  );
  expect(Alerts.showPopup).toHaveBeenLastCalledWith({
    title: 'Request failed',
    content: '400: Invalid request',
  });
});

it('displays errors without requiring a translation prefix', () => {
  displayError({ status: 500, error: 'Internal Server Error' }, 'Request failed');
  expect(Alerts.showPopup).toHaveBeenLastCalledWith({
    title: 'Request failed',
    content: '500: Internal Server Error',
  });
});

it('retains stack traces for ordinary Errors', () => {
  const error = new Error('Network unavailable');
  displayError(error, 'Request failed');
  expect(Alerts.showPopup).toHaveBeenLastCalledWith({
    title: 'Request failed',
    content: `${error.message}\n${error.stack}`,
  });
});

it('preserves existing string error messages and authentication titles', () => {
  displayErrorMsg('403: Invalid OPcode', 'Request failed');
  expect(Alerts.showPopup).toHaveBeenLastCalledWith({
    title: 'Invalid OPcode: Request failed',
    content: '403: Invalid OPcode',
  });
});

// mock for JavaScript 'fetch'
// we emulate a 100ms delay when i) fetching data and ii) parsing it as text
global.fetch = (url: string) =>
  new Promise((rs, rj) => {
    setTimeout(() =>
      rs({
        text: () =>
          new Promise((rs, rj) => {
            setTimeout(() => rs('mock data for ' + url), 100);
          }),
      }),
    );
  }) as any;

it('fetches text from a URL and caches it so the next call is faster', async () => {
  const tsBeforeCalls = Date.now();
  const text1 = await fetchUrlCached(
    'https://raw.githubusercontent.com/e-mission/e-mission-phone/master/README.md',
  );
  const tsBetweenCalls = Date.now();
  const text2 = await fetchUrlCached(
    'https://raw.githubusercontent.com/e-mission/e-mission-phone/master/README.md',
  );
  const tsAfterCalls = Date.now();
  expect(text1).toEqual(expect.stringContaining('mock data'));
  expect(text2).toEqual(expect.stringContaining('mock data'));
  expect(tsAfterCalls - tsBetweenCalls).toBeLessThan(tsBetweenCalls - tsBeforeCalls);
});

it.each([
  [new Error('Network unavailable'), 'Network unavailable'],
  ['Connection refused', 'Connection refused'],
  [{ status: 500, error: 'Internal Server Error' }, '500: Internal Server Error'],
  [{ status: 400, body: { error: 'Invalid query', code: 'INVALID_QUERY' } }, '400: Invalid query'],
  [{ status: 502, body: 'Bad gateway' }, '502: Bad gateway'],
  [{ message: 'Request failed' }, 'Request failed'],
  [{ unexpected: true }, '{"unexpected":true}'],
])('normalizes an error and retains its cause: %p', (cause, message) => {
  const error = withErrorContext('While getting aggregate data', cause);
  expect(getServerErrorMessage(cause)).toBe(message);
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toBe(`While getting aggregate data, ${message}`);
  expect(error.cause).toBe(cause);
});

it('preserves native aggregate errors with readable context', async () => {
  const originalCordova = window['cordova'];
  const cause = { status: 500, error: 'Internal Server Error' };
  window['cordova'] = {
    plugin: { http: { sendRequest: (_url, _options, _onSuccess, onError) => onError(cause) } },
  };
  try {
    await expect(getAggregateData('result/metrics/yyyy_mm_dd', {})).rejects.toMatchObject({
      message: 'While getting aggregate data, 500: Internal Server Error',
      cause,
    });
  } finally {
    window['cordova'] = originalCordova;
  }
});

it('sends unauthenticated aggregate requests as JSON', async () => {
  const originalCordova = window['cordova'];
  const sendRequest = jest.fn((_url, _options, onSuccess) => {
    onSuccess({ data: { metrics: [] } });
  });
  window['cordova'] = { plugin: { http: { sendRequest } } };
  try {
    const query = { start_time: '2026-10-01', end_time: '2026-10-09' };
    await expect(getAggregateData('result/metrics/yyyy_mm_dd', query)).resolves.toEqual({
      metrics: [],
    });
    expect(sendRequest).toHaveBeenCalledWith(
      'http://localhost:8080/result/metrics/yyyy_mm_dd',
      {
        method: 'post',
        data: { ...query, aggregate: true },
        serializer: 'json',
        responseType: 'json',
      },
      expect.any(Function),
      expect.any(Function),
    );
  } finally {
    window['cordova'] = originalCordova;
  }
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
  * - registerUser
  * - updateUser
  * - getUser
  * - putOne
  * - getUserCustomLabels
  * - insertUserCustomLabel
  * - updateUserCustomLabel
  * - deleteUserCustomLabel
*/
