import { clearAlerts, mockAlert, mockLogger } from '../__mocks__/globalMocks';
import {
  useGeojsonForTrip,
  readAllCompositeTrips,
  readUnprocessedTrips,
  compositeTrips2TimelineMap,
} from '../js/diary/timelineHelper';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import * as mockTLH from '../__mocks__/timelineHelperMocks';
import { GeoJSON, GjFeature } from '../js/types/diaryTypes';

mockLogger();
mockAlert();
mockBEMUserCache();

beforeEach(() => {
  clearAlerts();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('useGeojsonForTrip', () => {
  it('work with an empty input', () => {
    const testVal = useGeojsonForTrip(null, null, null);
    expect(testVal).toBeFalsy;
  });

  const checkGeojson = (geoObj: GeoJSON) => {
    expect(geoObj.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: 'FeatureCollection',
        features: expect.any(Array<GjFeature>),
      }),
    );
  };

  it('works without labelMode flag', () => {
    const testValue = useGeojsonForTrip(
      mockTLH.mockDataTwo.phone_data[1].data,
      mockTLH.mockLabelOptions,
    );
    checkGeojson(testValue);
    expect(testValue.data.features.length).toBe(3);
  });
});

describe('compositeTrips2TimelineMap', () => {
  const firstTripList = [mockTLH.mockData.phone_data[0].data];
  const secondTripList = [
    mockTLH.mockDataTwo.phone_data[0].data,
    mockTLH.mockDataTwo.phone_data[1].data,
  ];
  const firstKey = mockTLH.mockData.phone_data[0].data._id.$oid;
  const secondKey = mockTLH.mockDataTwo.phone_data[1].data._id.$oid;
  const thirdKey = mockTLH.mockData.phone_data[0].data._id.$oid;
  let testValue;

  it('Works with an empty list', () => {
    expect(Object.keys(compositeTrips2TimelineMap([])).length).toBe(0);
  });

  it('Works with a list of len = 1, no flag', () => {
    testValue = compositeTrips2TimelineMap(firstTripList);
    expect(testValue.size).toBe(1);
    expect(testValue.get(firstKey)).toEqual(firstTripList[0]);
  });

  it('Works with a list of len = 1, with flag', () => {
    testValue = compositeTrips2TimelineMap(firstTripList, true);
    expect(testValue.size).toBe(3);
    expect(testValue.get(firstKey)).toEqual(firstTripList[0]);
    expect(testValue.get('startConfirmedPlace')).toEqual(firstTripList[0].start_confirmed_place);
    expect(testValue.get('endConfirmedPlace')).toEqual(firstTripList[0].end_confirmed_place);
  });

  it('Works with a list of len >= 1, no flag', () => {
    testValue = compositeTrips2TimelineMap(secondTripList);
    expect(testValue.size).toBe(2);
    expect(testValue.get(secondKey)).toEqual(secondTripList[1]);
    expect(testValue.get(thirdKey)).toEqual(secondTripList[0]);
  });

  it('Works with a list of len >= 1, with flag', () => {
    testValue = compositeTrips2TimelineMap(secondTripList, true);
    console.log(`Len: ${testValue.size}`);
    expect(testValue.size).toBe(6);
  });
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
