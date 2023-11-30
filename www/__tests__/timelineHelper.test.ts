import { clearAlerts, mockAlert, mockLogger } from '../__mocks__/globalMocks';
import {
  useGeojsonForTrip,
  readAllCompositeTrips,
  readUnprocessedTrips,
  compositeTrips2TimelineMap,
  updateUnprocessedInputs,
  keysForLabelInputs,
} from '../js/diary/timelineHelper';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import * as mockTLH from '../__mocks__/timelineHelperMocks';
import { unprocessedLabels } from '../js/diary/timelineHelper';
import { GeoJSONData, GeoJSONStyledFeature, UserInputEntry } from '../js/types/diaryTypes';

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

  const checkGeojson = (geoObj: GeoJSONData) => {
    expect(geoObj.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: 'FeatureCollection',
        features: expect.any(Array<GeoJSONStyledFeature>),
      }),
    );
  };

  it('works without labelMode flag', () => {
    const testValue = useGeojsonForTrip(
      mockTLH.mockCompDataTwo.phone_data[1].data,
      mockTLH.mockLabelOptions,
    );
    checkGeojson(testValue);
    expect(testValue.data.features.length).toBe(3);
  });
});

describe('compositeTrips2TimelineMap', () => {
  const tripListOne = [mockTLH.mockCompData.phone_data[0].data];
  const tripListTwo = [
    mockTLH.mockCompDataTwo.phone_data[0].data,
    mockTLH.mockCompDataTwo.phone_data[1].data,
  ];
  const keyOne = mockTLH.mockCompData.phone_data[0].data._id.$oid;
  const keyTwo = mockTLH.mockCompDataTwo.phone_data[1].data._id.$oid;
  const keyThree = mockTLH.mockCompData.phone_data[0].data._id.$oid;
  let testValue;

  it('Works with an empty list', () => {
    expect(Object.keys(compositeTrips2TimelineMap([])).length).toBe(0);
  });

  it('Works with a list of len = 1, no flag', () => {
    testValue = compositeTrips2TimelineMap(tripListOne);
    expect(testValue.size).toBe(1);
    expect(testValue.get(keyOne)).toEqual(tripListOne[0]);
  });

  it('Works with a list of len = 1, with flag', () => {
    testValue = compositeTrips2TimelineMap(tripListOne, true);
    expect(testValue.size).toBe(3);
    expect(testValue.get(keyOne)).toEqual(tripListOne[0]);
    expect(testValue.get('startConfirmedPlace')).toEqual(tripListOne[0].start_confirmed_place);
    expect(testValue.get('endConfirmedPlace')).toEqual(tripListOne[0].end_confirmed_place);
  });

  it('Works with a list of len >= 1, no flag', () => {
    testValue = compositeTrips2TimelineMap(tripListTwo);
    expect(testValue.size).toBe(2);
    expect(testValue.get(keyTwo)).toEqual(tripListTwo[1]);
    expect(testValue.get(keyThree)).toEqual(tripListTwo[0]);
  });

  it('Works with a list of len >= 1, with flag', () => {
    testValue = compositeTrips2TimelineMap(tripListTwo, true);
    expect(testValue.size).toBe(6);
  });
});

it('use an appConfig to get labelInputKeys', () => {
  expect(keysForLabelInputs(mockTLH.mockAppConfigOne)).toEqual(['manual/trip_user_input']);
  expect(keysForLabelInputs(mockTLH.mockAppConfigTwo).length).toEqual(3);
});

// updateUnprocessedInputs Tests
jest.mock('../js/survey/multilabel/confirmHelper', () => ({
  ...jest.requireActual('../js/survey/multilabel/confirmHelper'),
  getLabelInputs: jest.fn(() => ['MODE', 'PURPOSE', 'REPLACED_MODE']),
}));

it('processed empty labels', async () => {
  await updateUnprocessedInputs([], [], mockTLH.mockAppConfigThree);
  expect(unprocessedLabels).toEqual({});
});

it('updates unprocessed labels', async () => {
  await updateUnprocessedInputs(mockTLH.mockLabelDataPromises, [], mockTLH.mockAppConfigThree);
  expect(unprocessedLabels).toEqual(
    expect.objectContaining({
      MODE: expect.any(Array<UserInputEntry>),
      PURPOSE: expect.any(Array<UserInputEntry>),
      REPLACED_MODE: expect.any(Array<UserInputEntry>),
    }),
  );
  expect(unprocessedLabels.MODE.length).toEqual(2);
  expect(unprocessedLabels.PURPOSE.length).toEqual(2);
  expect(unprocessedLabels.REPLACED_MODE.length).toEqual(0);
});

// Tests for readAllCompositeTrips
// Once we have end-to-end testing, we could utilize getRawEnteries.
jest.mock('../js/services/commHelper', () => ({
  getRawEntries: jest.fn((key, startTs, endTs, valTwo) => {
    if (startTs === mockTLH.fakeStartTsOne) return mockTLH.mockCompData;
    if (startTs == mockTLH.fakeStartTsTwo) return mockTLH.mockCompDataTwo;
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
    if (key === 'statemachine/transition') {
      if (tq.startTs === mockTLH.fakeStartTsOne) return Promise.resolve(mockTLH.mockTransitions);
      return Promise.resolve([]);
    }
    if (key === 'background/filtered_location') {
      return Promise.resolve(mockTLH.mockFilterLocations);
    }
  }),
}));

it('works when there are no unprocessed trips...', async () => {
  expect(readUnprocessedTrips(-1, -1, null)).resolves.toEqual([]);
});

it('works when there are one or more unprocessed trips...', async () => {
  const testValueOne = await readUnprocessedTrips(
    mockTLH.fakeStartTsOne,
    mockTLH.fakeEndTsOne,
    null,
  );
  expect(testValueOne.length).toEqual(1);
  expect(testValueOne[0]).toEqual(
    expect.objectContaining({
      origin_key: expect.any(String),
      distance: expect.any(Number),
      start_loc: expect.objectContaining({
        type: expect.any(String),
        coordinates: expect.any(Array<Number>),
      }),
    }),
  );
});
