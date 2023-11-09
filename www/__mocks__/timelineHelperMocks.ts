import { MetaData, ServerData, ServerResponse } from '../js/types/serverData';
import { CompositeTrip, TripTransition } from '../js/types/diaryTypes';

const mockMetaData: MetaData = {
  write_ts: -13885091,
  key: 'test/value',
  platform: 'test',
  time_zone: 'America/Los_Angeles',
  write_fmt_time: '1969-07-16T07:01:49.000Z',
  write_local_dt: null,
  origin_key: '12345',
};

export const mockData: ServerResponse<CompositeTrip> = {
  phone_data: [
    {
      data: {
        _id: null,
        additions: [],
        cleaned_section_summary: null,
        cleaned_trip: null,
        confidence_threshold: -1,
        confirmed_trip: null,
        distance: 777,
        duration: 777,
        end_confirmed_place: {
          data: null,
          metadata: mockMetaData,
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
          data: null,
          metadata: mockMetaData,
        },
        start_fmt_time: '2023-11-01T17:55:20.999397-07:00',
        start_loc: {
          type: 'Point',
          coordinates: [-1, -1],
        },
        start_local_dt: null,
        start_place: null,
        start_ts: null,
        user_input: null,
      },
      metadata: mockMetaData,
    },
  ],
};
export const mockDataTwo = {
  phone_data: [mockData.phone_data[0], mockData.phone_data[0]],
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

export const readAllCheckOne = [
  {
    additions: [],
    cleaned_section_summary: null,
    cleaned_trip: null,
    confidence_threshold: -1,
    confirmed_trip: null,
    distance: 777,
    duration: 777,
    end_confirmed_place: {
      key: 'test/value',
      origin_key: '12345',
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
    key: 'test/value',
    locations: [
      {
        key: 'test/value',
        origin_key: '12345',
      },
    ],
    origin_key: '12345',
    raw_trip: null,
    sections: [
      {
        key: 'test/value',
        origin_key: '12345',
      },
    ],
    source: 'DwellSegmentationDistFilter',
    start_confirmed_place: {
      key: 'test/value',
      origin_key: '12345',
    },
    start_fmt_time: '2023-11-01T17:55:20.999397-07:00',
    start_loc: {
      type: 'Point',
      coordinates: [-1, -1],
    },
    start_local_dt: null,
    start_place: null,
    start_ts: null,
    user_input: null,
  },
];
