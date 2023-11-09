import { mockLogger } from '../__mocks__/globalMocks';
import { readAllCompositeTrips, readUnprocessedTrips } from '../js/diary/timelineHelper';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';

import { MetaData, ServerResponse } from '../js/types/serverData';
import { CompositeTrip } from '../js/types/diaryTypes';

mockLogger();
mockBEMUserCache();

afterAll(() => {
  jest.restoreAllMocks();
});

const mockMetaData: MetaData = {
  write_ts: -13885091,
  key: 'test/value',
  platform: 'test',
  time_zone: 'America/Los_Angeles',
  write_fmt_time: '1969-07-16T07:01:49.000Z',
  write_local_dt: null,
  origin_key: '12345',
};

const mockData: ServerResponse<CompositeTrip> = {
  phone_data: [
    {
      data: {
        _id: null,
        additions: [],
        cleaned_section_summary: null, // TODO
        cleaned_trip: null, //ObjId;
        confidence_threshold: -1,
        confirmed_trip: null, //ObjId;
        distance: 777,
        duration: 777,
        end_confirmed_place: {
          data: null,
          metadata: JSON.parse(JSON.stringify(mockMetaData)),
        },
        end_fmt_time: '2023-11-01T17:55:20.999397-07:00',
        end_loc: {
          type: 'Point',
          coordinates: [-1, -1],
        },
        end_local_dt: null, //LocalDt;
        end_place: null, //ObjId;
        end_ts: -1,
        expectation: null, // TODO "{to_label: boolean}"
        expected_trip: null, //ObjId;
        inferred_labels: [], // TODO
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
            metadata: JSON.parse(JSON.stringify(mockMetaData)),
            data: null,
          },
        ], // LocationType
        origin_key: '',
        raw_trip: null,
        sections: [
          {
            metadata: JSON.parse(JSON.stringify(mockMetaData)),
            data: null,
          },
        ], // TODO
        source: 'DwellSegmentationDistFilter',
        start_confirmed_place: {
          data: null,
          metadata: JSON.parse(JSON.stringify(mockMetaData)),
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
      metadata: JSON.parse(JSON.stringify(mockMetaData)),
    },
  ],
};

// When called by mocks, pair 1 returns 1 value, Pair two 2, pair 3 returns none.
const fakeStartTsOne = -14576291;
const fakeEndTsOne = -13885091;
const fakeStartTsTwo = 1092844665;
const fakeEndTsTwo = 1277049465;

// Once we have end-to-end testing, we could utilize getRawEnteries.
jest.mock('../js/commHelper', () => ({
  getRawEntries: jest.fn((val, startTs, endTs, valTwo) => {
    if (startTs === fakeStartTsOne && endTs === fakeEndTsOne) return mockData;
    if (startTs == fakeStartTsTwo && endTs === fakeEndTsTwo) {
      console.log('Twoy!');
      let dataCopy = JSON.parse(JSON.stringify(mockData));
      let temp = [dataCopy.phone_data[0], dataCopy.phone_data[0]];
      dataCopy.phone_data = temp;
      console.log(`This is phoneData: ${JSON.stringify(dataCopy.phone_data.length)}`);
      return dataCopy;
    }
    return {};
  }),
}));

it('works when there are no composite trip objects fetched', async () => {
  expect(readAllCompositeTrips(-1, -1)).resolves.not.toThrow();
});

it('fetches a composite trip object and collapses it', async () => {
  expect(readAllCompositeTrips(fakeStartTsOne, fakeEndTsOne)).resolves.not.toThrow();
  expect(readAllCompositeTrips(fakeStartTsTwo, fakeEndTsTwo)).resolves.not.toThrow();
});

jest.mock('../js/unifiedDataLoader', () => ({
  getUnifiedDataForInterval: jest.fn(() => {
    return Promise.resolve([]);
  }),
}));

it('works when there are no unprocessed trips...', async () => {
  expect(readUnprocessedTrips(fakeStartTsOne, fakeEndTsOne, null)).resolves.not.toThrow();
});

it('works when there are no unprocessed trips...', async () => {
  expect(readUnprocessedTrips(fakeStartTsOne, fakeEndTsOne, null)).resolves.not.toThrow();
});
