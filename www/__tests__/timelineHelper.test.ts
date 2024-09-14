import {
  useGeojsonForTrip,
  readAllCompositeTrips,
  readUnprocessedTrips,
  compositeTrips2TimelineMap,
  keysForLabelInputs,
  updateAllUnprocessedInputs,
  updateLocalUnprocessedInputs,
  unprocessedLabels,
  unprocessedNotes,
} from '../js/diary/timelineHelper';
import * as mockTLH from '../__mocks__/timelineHelperMocks';
import { GeoJSONData, GeoJSONStyledFeature } from '../js/types/diaryTypes';

describe('useGeojsonForTrip', () => {
  it('work with an empty input', () => {
    const testVal = useGeojsonForTrip({} as any);
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
    const testValue = useGeojsonForTrip(mockTLH.mockCompDataTwo.phone_data[1].data) as GeoJSONData;
    expect(testValue).toBeTruthy;
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
    for (const [key, value] of Object.entries(testValue)) {
      expect(value).toBe(tripListTwo[0][key] || tripListTwo[1][key]);
    }
  });
});

it('use an appConfig to get labelInputKeys', () => {
  expect(keysForLabelInputs(mockTLH.mockConfigEnketo)).toEqual(['manual/trip_user_input']);
  expect(keysForLabelInputs(mockTLH.mockConfigModeOfStudy).length).toEqual(3);
});

// updateUnprocessedInputs Tests
jest.mock('../js/survey/multilabel/confirmHelper', () => ({
  ...jest.requireActual('../js/survey/multilabel/confirmHelper'),
  getLabelInputs: jest.fn(() => ['MODE', 'PURPOSE', 'REPLACED_MODE']),
}));

describe('unprocessedLabels, unprocessedNotes', () => {
  it('has no labels or notes when nothing has been recorded', async () => {
    await updateAllUnprocessedInputs({ start_ts: 0, end_ts: 99 }, mockTLH.mockConfigNoModeOfStudy);
    Object.values(unprocessedLabels).forEach((value) => {
      expect(value).toEqual([]);
    });
    expect(unprocessedNotes).toEqual([]);
  });

  it('has some mode and purpose labels after they were just recorded', async () => {
    // record some labels
    await window['cordova'].plugins.BEMUserCache.putMessage('manual/mode_confirm', {
      start_ts: 2,
      end_ts: 3,
      label: 'tricycle',
    });
    await window['cordova'].plugins.BEMUserCache.putMessage('manual/purpose_confirm', {
      start_ts: 2,
      end_ts: 3,
      label: 'shopping',
    });

    // update unprocessed inputs and check that the new labels show up in unprocessedLabels
    await updateLocalUnprocessedInputs({ start_ts: 2, end_ts: 3 }, mockTLH.mockConfigNoModeOfStudy);
    expect(unprocessedLabels['MODE'].length).toEqual(1);
    expect(unprocessedLabels['MODE'][0].data.label).toEqual('tricycle');
    expect(unprocessedLabels['PURPOSE'].length).toEqual(1);
    expect(unprocessedLabels['PURPOSE'][0].data.label).toEqual('shopping');
  });

  it('has some trip- and place- survey responses after they were just recorded', async () => {
    // record two survey responses, one for trip_user_input and one for place_user_input
    const tripSurveyResponse = {
      start_ts: 4,
      end_ts: 5,
      name: 'TripConfirmSurvey', // for now, the name of this survey must be hardcoded (see note in UserInputButton.tsx)
      version: 1.2,
      label: '1 foobar',
      match_id: 'd263935e-9163-4072-9909-9d3e1edb31be',
      key: 'manual/trip_user_input',
      xmlResponse: `<data xmlns:jr="http://openrosa.org/javarosa" xmlns:odk="http://www.opendatakit.org/xforms" xmlns:orx="http://openrosa.org/xforms" id="snapshot_xml"> <start>2023-12-04T12:12:38.968-05:00</start> <end>2023-12-04T12:12:38.970-05:00</end> <foo>bar</foo> <meta><instanceID>uuid:75dc7b18-2a9d-4356-b66e-d63dfa7568ca</instanceID></meta> </data>`,
    };
    const placeSurveyResponse = {
      ...tripSurveyResponse,
      start_ts: 5,
      end_ts: 6,
      key: 'manual/place_user_input',
    };
    await window['cordova'].plugins.BEMUserCache.putMessage(
      'manual/trip_user_input',
      tripSurveyResponse,
    );
    await window['cordova'].plugins.BEMUserCache.putMessage(
      'manual/place_user_input',
      placeSurveyResponse,
    );

    // update unprocessed inputs and check that the trip survey response shows up in unprocessedLabels
    await updateAllUnprocessedInputs({ start_ts: 4, end_ts: 6 }, mockTLH.mockConfigEnketo);
    expect(unprocessedLabels['TripConfirmSurvey'][0].data).toEqual(tripSurveyResponse);
    // the second response is ignored for now because we haven't enabled place_user_input yet
    // so the length is only 1
    expect(unprocessedLabels['TripConfirmSurvey'].length).toEqual(1);
  });

  it('has some trip- and place- level additions after they were just recorded', async () => {
    // record two additions, one for trip_addition_input and one for place_addition_input
    const tripAdditionOne = {
      start_ts: 6,
      end_ts: 7,
      key: 'manual/trip_addition_input',
      data: { foo: 'bar' },
    };
    const tripAdditionTwo = {
      ...tripAdditionOne,
      data: { foo: 'baz' },
    };
    const placeAdditionOne = {
      ...tripAdditionOne,
      start_ts: 7,
      end_ts: 8,
      key: 'manual/place_addition_input',
    };
    const placeAdditionTwo = {
      ...placeAdditionOne,
      data: { foo: 'baz' },
    };
    Promise.all([
      window['cordova'].plugins.BEMUserCache.putMessage(
        'manual/trip_addition_input',
        tripAdditionOne,
      ),
      window['cordova'].plugins.BEMUserCache.putMessage(
        'manual/place_addition_input',
        tripAdditionTwo,
      ),
      window['cordova'].plugins.BEMUserCache.putMessage(
        'manual/trip_addition_input',
        placeAdditionOne,
      ),
      window['cordova'].plugins.BEMUserCache.putMessage(
        'manual/place_addition_input',
        placeAdditionTwo,
      ),
    ]).then(() => {
      // update unprocessed inputs and check that all additions show up in unprocessedNotes
      updateAllUnprocessedInputs({ start_ts: 6, end_ts: 8 }, mockTLH.mockConfigEnketo);
      expect(unprocessedLabels['NOTES'].length).toEqual(4);
      expect(unprocessedLabels['NOTES'][0].data).toEqual(tripAdditionOne);
      expect(unprocessedLabels['NOTES'][1].data).toEqual(tripAdditionTwo);
      expect(unprocessedLabels['NOTES'][2].data).toEqual(placeAdditionOne);
      expect(unprocessedLabels['NOTES'][3].data).toEqual(placeAdditionTwo);
    });
  });
});

// Tests for readAllCompositeTrips
// Once we have end-to-end testing, we could utilize getRawEnteries.
jest.mock('../js/services/commHelper', () => ({
  getRawEntries: jest.fn((key, startTs, endTs, valTwo) => {
    if (startTs === mockTLH.fakeStartTsOne) return mockTLH.mockCompData;
    if (startTs == mockTLH.fakeStartTsTwo) return mockTLH.mockCompDataTwo;
    // the original implementation of `getRawEntries` for all other inputs
    return jest
      .requireActual('../js/services/commHelper')
      .getRawEntries(key, startTs, endTs, valTwo);
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
    // the original implementation of `getUnifiedDataForInterval` for other keys
    return jest
      .requireActual('../js/services/unifiedDataLoader')
      .getUnifiedDataForInterval(key, tq, combiner);
  }),
}));

it('works when there are no unprocessed trips...', async () => {
  expect(readUnprocessedTrips(-1, -1, {} as any, {} as any)).resolves.toEqual([]);
});

it('works when there are one or more unprocessed trips...', async () => {
  const testValueOne = await readUnprocessedTrips(
    mockTLH.fakeStartTsOne,
    mockTLH.fakeEndTsOne,
    {} as any,
    {} as any,
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
