import { clearAlerts, mockAlert, mockLogger } from '../__mocks__/globalMocks';
import {
  useGeojsonForTrip,
  readAllCompositeTrips,
  readUnprocessedTrips,
} from '../js/diary/timelineHelper';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import * as mockTLH from '../__mocks__/timelineHelperMocks';

mockLogger();
mockAlert();
mockBEMUserCache();

beforeEach(() => {
  clearAlerts();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Tests for readAllCompositeTrips
// Once we have end-to-end testing, we could utilize getRawEnteries.
jest.mock('../js/services/commHelper', () => ({
  getRawEntries: jest.fn((key, startTs, endTs, valTwo) => {
    if (startTs === mockTLH.fakeStartTsOne) return mockTLH.mockData;
    if (startTs == mockTLH.fakeStartTsTwo) return mockTLH.mockDataTwo;
    return {};
  }),
}));

it('works when there are no composite trip objects fetched', async () => {
  expect(readAllCompositeTrips(-1, -1)).resolves.toEqual([]);
});

// Checks that `readAllCompositeTrips` properly unpacks & flattens the confirmedPlaces
const checkTripIsUnpacked = (obj) => {
  expect(obj.metadata).toBeUndefined();
  expect(obj).toEqual(
    expect.objectContaining({
      key: expect.any(String),
      origin_key: expect.any(String),
      start_confirmed_place: expect.objectContaining({
        origin_key: expect.any(String),
      }),
      end_confirmed_place: expect.objectContaining({
        origin_key: expect.any(String),
      }),
      locations: expect.any(Array),
      sections: expect.any(Array),
    }),
  );
};

it('fetches a composite trip object and collapses it', async () => {
  const testValue = await readAllCompositeTrips(mockTLH.fakeStartTsOne, mockTLH.fakeEndTsOne);
  expect(testValue.length).toEqual(1);
  checkTripIsUnpacked(testValue[0]);
});

it('Works with multiple trips', async () => {
  const testValue = await readAllCompositeTrips(mockTLH.fakeStartTsTwo, mockTLH.fakeEndTsTwo);
  expect(testValue.length).toEqual(2);
  checkTripIsUnpacked(testValue[0]);
  checkTripIsUnpacked(testValue[1]);
  expect(testValue[0].origin_key).toBe('1');
  expect(testValue[1].origin_key).toBe('2');
});

// Tests for `readUnprocessedTrips`
jest.mock('../js/services/unifiedDataLoader', () => ({
  getUnifiedDataForInterval: jest.fn((key, tq, combiner) => {
    if (tq.startTs === mockTLH.fakeStartTsOne) return Promise.resolve(mockTLH.mockTransition);
    if (tq.startTs === mockTLH.fakeStartTsTwo) return Promise.resolve(mockTLH.mockTransitionTwo);
    return Promise.resolve([]);
  }),
}));

it('works when there are no unprocessed trips...', async () => {
  expect(readUnprocessedTrips(-1, -1, null)).resolves.toEqual([]);
});

// In manual testing, it seems that `trip_gj_list` always returns
// as an empty array - should find data where this is different...
it('works when there are one or more unprocessed trips...', async () => {
  const testValueOne = await readUnprocessedTrips(
    mockTLH.fakeStartTsOne,
    mockTLH.fakeEndTsOne,
    null,
  );
  expect(testValueOne).toEqual([]);
});
