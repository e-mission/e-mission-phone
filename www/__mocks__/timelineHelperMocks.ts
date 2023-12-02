import { LocalDt, MetaData, ServerData, ServerResponse } from '../js/types/serverData';
import {
  CompositeTrip,
  ConfirmedPlace,
  FilteredLocation,
  TripTransition,
  UnprocessedTrip,
} from '../js/types/diaryTypes';
import { LabelOptions } from '../js/types/labelTypes';

const mockMetaData: MetaData = {
  write_ts: 1,
  key: 'test/value/one',
  platform: 'test',
  time_zone: 'America/Los_Angeles',
  write_fmt_time: '1969-07-16T07:01:49.000Z',
  write_local_dt: null as any,
  origin_key: '1',
};

export const mockLabelOptions: LabelOptions = {
  MODE: null,
  PURPOSE: null,
  REPLACED_MODE: null,
  translations: null,
} as unknown as LabelOptions;

const mockConfirmedPlaceData = {
  source: 'DwellSegmentationTimeFilter',
  location: {
    type: 'Point',
    coordinates: [-122.0876886, 37.3887767],
  },
  cleaned_place: {
    $oid: '6553c3a0f27f16fbf9d1def1',
  },
  additions: [],
  user_input: {},
  enter_fmt_time: '2015-07-22T08:14:53.881000-07:00',
  exit_fmt_time: '2015-07-22T08:14:53.881000-07:00',
  starting_trip: {
    $oid: '6553c3a1f27f16fbf9d1df15',
  },
  ending_trip: {
    $oid: '6553c3a1f27f16fbf9d1df15',
  },
  enter_local_dt: null,
  exit_local_dt: null,
  raw_places: [
    {
      $oid: '6553c39df27f16fbf9d1dcef',
    },
    {
      $oid: '6553c39df27f16fbf9d1dcef',
    },
  ],
  enter_ts: 1437578093.881,
  exit_ts: 1437578093.881,
} as unknown as ConfirmedPlace;

// using parse/stringify to deep copy & populate data
let tempMetaData = JSON.parse(JSON.stringify(mockMetaData));
tempMetaData.write_ts = 2;
tempMetaData.origin_key = '2';
export const mockMetaDataTwo = tempMetaData;

export const mockUnprocessedTrip: UnprocessedTrip = {
  _id: { $oid: 'mockUnprocessedTrip' },
  additions: [],
  confidence_threshold: 0.0,
  distance: 1.0,
  duration: 3.0,
  end_fmt_time: '',
  end_loc: { type: '', coordinates: [] },
  end_local_dt: null,
  expectation: null,
  inferred_labels: [],
  key: 'mockUnprocessedTrip',
  locations: [],
  origin_key: '',
  source: '',
  start_local_dt: null,
  start_ts: 0.1,
  start_loc: { type: '', coordinates: [] },
  starting_trip: null,
  user_input: null,
};

export const mockCompData: ServerResponse<CompositeTrip> = {
  phone_data: [
    {
      data: {
        _id: { $oid: 'mockDataOne' },
        additions: [],
        cleaned_section_summary: null,
        cleaned_trip: null,
        confidence_threshold: -1,
        confirmed_trip: null,
        distance: 777,
        duration: 777,
        end_confirmed_place: {
          data: mockConfirmedPlaceData,
          metadata: mockMetaData,
          _id: { $oid: 'endConfirmedPlace' },
        },
        end_fmt_time: '2023-11-01T17:55:20.999397-07:00',
        end_loc: {
          type: 'Point',
          coordinates: [-1, -1],
        },
        end_local_dt: null,
        end_place: null,
        end_ts: -1,
        expectation: null,
        expected_trip: null,
        inferred_labels: [],
        inferred_section_summary: {
          count: {
            CAR: 1,
            WALKING: 1,
          },
          distance: {
            CAR: 222,
            WALKING: 222,
          },
          duration: {
            CAR: 333,
            WALKING: 333,
          },
        },
        inferred_trip: null,
        key: '12345',
        locations: [
          {
            metadata: mockMetaData,
            data: null,
          },
        ],
        origin_key: '',
        raw_trip: null,
        sections: [
          {
            metadata: mockMetaData,
            data: null,
          },
        ],
        source: 'DwellSegmentationDistFilter',
        start_confirmed_place: {
          data: mockConfirmedPlaceData,
          metadata: mockMetaData,
          _id: { $oid: 'startConfirmedPlace' },
        },
        start_fmt_time: '2023-11-01T17:55:20.999397-07:00',
        start_loc: {
          type: 'Point',
          coordinates: [-1, -1],
        },
        start_local_dt: null,
        start_place: null,
        start_ts: 1,
        user_input: null,
      },
      metadata: mockMetaData,
    },
  ],
} as unknown as ServerResponse<CompositeTrip>;

// Setup for second mockData
let newPhoneData = JSON.parse(JSON.stringify(mockCompData.phone_data[0]));
newPhoneData.data._id.$oid = 'mockDataTwo';
newPhoneData.metadata = mockMetaDataTwo;
newPhoneData.data.start_confirmed_place.metadata = mockMetaDataTwo;
newPhoneData.data.start_confirmed_place._id.$oid = 'startConfirmedPlaceTwo';
newPhoneData.data.end_confirmed_place.metadata = mockMetaDataTwo;
newPhoneData.data.end_confirmed_place._id.$oid = 'endConfirmedPlaceTwo';
export const mockCompDataTwo = {
  phone_data: [mockCompData.phone_data[0], newPhoneData],
};

export const mockTransitions: Array<ServerData<TripTransition>> = [
  {
    data: {
      // mock of a startTransition
      currstate: '',
      transition: 'T_EXITED_GEOFENCE',
      ts: 1,
    },
    metadata: mockMetaData,
  },
  {
    data: {
      // mock of an endTransition
      currstate: '',
      transition: 'T_TRIP_ENDED',
      ts: 9999,
    },
    metadata: mockMetaData,
  },
];

const mockFilterLocation: FilteredLocation = {
  accuracy: 0.1,
  altitude: 100,
  elapsedRealtimeNanos: 10000,
  filter: 'time',
  fmt_time: '',
  heading: 1.0,
  latitude: 1.0,
  loc: null,
  local_dt: null,
  longitude: -1.0,
  sensed_speed: 0,
  ts: 100,
};
let mockFilterLocationTwo = JSON.parse(JSON.stringify(mockFilterLocation));
mockFilterLocationTwo.ts = 900;
mockFilterLocationTwo.longitude = 200;
mockFilterLocationTwo.longitude = -200;

export const mockFilterLocations: Array<ServerData<FilteredLocation>> = [
  {
    data: mockFilterLocation,
    metadata: mockMetaData,
  },
  {
    data: mockFilterLocationTwo,
    metadata: mockMetaDataTwo,
  },
];

export const mockAppConfigOne = {
  survey_info: {
    'trip-labels': 'ENKETO',
  },
};
export const mockAppConfigTwo = {
  survey_info: {
    'trip-labels': 'Other',
  },
  intro: {
    mode_studied: 'sample_study',
  },
};
export const mockAppConfigThree = {
  survey_info: {
    'trip-labels': 'Other',
  },
  intro: {
    mode_studied: false,
  },
};

export const mockLabelDataPromises = [
  Promise.resolve([
    // Mode
    {
      data: {
        end_ts: 1681438322.981,
        label: 'walk',
        start_ts: 1681437527.4971218,
      },
      metadata: mockMetaData,
    },
    {
      data: {
        end_ts: 1681439339.983,
        label: 'walk',
        start_ts: 1681438918.6598706,
      },
      metadata: mockMetaDataTwo,
    },
  ]),
  Promise.resolve([
    // Purpose
    {
      data: {
        end_ts: 1681438322.981,
        label: 'test',
        start_ts: 1681437527.4971218,
      },
      metadata: mockMetaData,
    },
    {
      data: {
        end_ts: 1681438322.983,
        label: 'testValue',
        start_ts: 1681438918.6598706,
      },
      metadata: mockMetaDataTwo,
    },
  ]),
  Promise.resolve([]), // Replaced_Mode
];
//let mockLabelDataPromisesTwo = JSON.parse(JSON.stringify(mockLabelDataPromises));

// Used by jest.mocks() to return a various mocked objects.
export const fakeStartTsOne = -14576291;
export const fakeEndTsOne = -13885091;
export const fakeStartTsTwo = 1092844665;
export const fakeEndTsTwo = 1277049465;
