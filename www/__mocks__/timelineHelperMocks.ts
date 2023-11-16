import { MetaData, ServerData, ServerResponse } from '../js/types/serverData';
import { CompositeTrip, ConfirmedPlace, TripTransition } from '../js/types/diaryTypes';
import { LabelOptions } from '../js/types/labelTypes';

const mockMetaData: MetaData = {
  write_ts: 1,
  key: 'test/value/one',
  platform: 'test',
  time_zone: 'America/Los_Angeles',
  write_fmt_time: '1969-07-16T07:01:49.000Z',
  write_local_dt: null,
  origin_key: '1',
};

export const mockLabelOptions: LabelOptions = {
  MODE: null,
  PURPOSE: null,
  REPLACED_MODE: null,
  translations: null,
};

const mockConfirmedPlaceData: ConfirmedPlace = {
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
};

// using parse/stringify to deep copy & populate data
let tempMetaData = JSON.parse(JSON.stringify(mockMetaData));
tempMetaData.write_ts = 2;
tempMetaData.origin_key = '2';
export const mockMetaDataTwo = tempMetaData;

export const mockData: ServerResponse<CompositeTrip> = {
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
};

// Setup for second mockData
let newPhoneData = JSON.parse(JSON.stringify(mockData.phone_data[0]));
newPhoneData.data._id.$oid = 'mockDataTwo';
newPhoneData.metadata = mockMetaDataTwo;
newPhoneData.data.start_confirmed_place.metadata = mockMetaDataTwo;
newPhoneData.data.start_confirmed_place._id.$oid = 'startConfirmedPlaceTwo';
newPhoneData.data.end_confirmed_place.metadata = mockMetaDataTwo;
newPhoneData.data.end_confirmed_place._id.$oid = 'endConfirmedPlaceTwo';

export const mockDataTwo = {
  phone_data: [mockData.phone_data[0], newPhoneData],
};

export const mockTransition: Array<ServerData<TripTransition>> = [
  {
    data: {
      currstate: 'STATE_WAITING_FOR_TRIP_TO_START',
      transition: 'T_NOP',
      ts: 12345.6789,
    },
    metadata: mockMetaData,
  },
];

export const mockTransitionTwo = mockTransition.push(mockTransition[0]);

// When called by mocks, pair 1 returns 1 value, Pair two 2, pair 3 returns none.
export const fakeStartTsOne = -14576291;
export const fakeEndTsOne = -13885091;
export const fakeStartTsTwo = 1092844665;
export const fakeEndTsTwo = 1277049465;
