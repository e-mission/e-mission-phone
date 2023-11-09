import { clearAlerts, mockAlert, mockLogger } from '../__mocks__/globalMocks';
import { readAllCompositeTrips, readUnprocessedTrips } from '../js/diary/timelineHelper';
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

// Once we have end-to-end testing, we could utilize getRawEnteries.
jest.mock('../js/commHelper', () => ({
  getRawEntries: jest.fn((key, startTs, endTs, valTwo) => {
    if (startTs === mockTLH.fakeStartTsOne) return mockTLH.mockData;
    if (startTs == mockTLH.fakeStartTsTwo) return mockTLH.mockDataTwo;
    return {};
  }),
}));

it('works when there are no composite trip objects fetched', async () => {
  expect(readAllCompositeTrips(-1, -1)).resolves.toEqual([]);
});

it('fetches a composite trip object and collapses it', async () => {
  expect(readAllCompositeTrips(mockTLH.fakeStartTsOne, mockTLH.fakeEndTsOne)).resolves.toEqual(
    mockTLH.readAllCheckOne,
  );
  expect(
    readAllCompositeTrips(mockTLH.fakeStartTsTwo, mockTLH.fakeEndTsTwo),
  ).resolves.not.toThrow();
});

jest.mock('../js/unifiedDataLoader', () => ({
  getUnifiedDataForInterval: jest.fn((key, tq, combiner) => {
    if (tq.startTs === mockTLH.fakeStartTsOne) return Promise.resolve(mockTLH.mockTransition);
    if (tq.startTs === mockTLH.fakeStartTsTwo) return Promise.resolve(mockTLH.mockTransitionTwo);
    return Promise.resolve([]);
  }),
}));

it('works when there are no unprocessed trips...', async () => {
  expect(readUnprocessedTrips(-1, -1, null)).resolves.toEqual([]);
});

it('works when there are one or more unprocessed trips...', async () => {
  expect(
    readUnprocessedTrips(mockTLH.fakeStartTsOne, mockTLH.fakeEndTsOne, null),
  ).resolves.not.toThrow();
  expect(
    readUnprocessedTrips(mockTLH.fakeStartTsTwo, mockTLH.fakeEndTsTwo, null),
  ).resolves.not.toThrow();
});
