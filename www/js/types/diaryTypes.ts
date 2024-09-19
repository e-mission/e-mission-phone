/* This file provides typings for use in '/diary', including timeline objects (trips and places)
 and user input objects.
 As much as possible, these types parallel the types used in the server code. */

import { BaseModeKey, MotionTypeKey } from '../diary/diaryHelper';
import useDerivedProperties from '../diary/useDerivedProperties';
import { VehicleIdentity } from './appConfigTypes';
import { MultilabelKey } from './labelTypes';
import { BEMData, LocalDt } from './serverData';
import { FeatureCollection, Feature, Geometry, Point, Position } from 'geojson';

type ObjectId = { $oid: string };

type UserInput = {
  /* for keys ending in 'user_input' (e.g. 'trip_user_input'), the server gives us the raw user
      input object with 'data' and 'metadata' */
  [k: `${string}user_input`]: UserInputEntry;
  /* for keys ending in 'confirm' (e.g. 'mode_confirm'), the server just gives us the user input value
      as a string (e.g. 'walk', 'drove_alone') */
  [k: `${string}confirm`]: string;
};

export type ConfirmedPlace = {
  _id: ObjectId;
  additions: UserInputEntry[];
  cleaned_place: ObjectId;
  duration: number;
  ending_trip: ObjectId;
  enter_fmt_time: string; // ISO string e.g. 2023-10-31T12:00:00.000-04:00
  enter_local_dt: LocalDt;
  enter_ts: number; // Unix timestamp
  exit_fmt_time: string; // ISO string e.g. 2023-10-31T12:00:00.000-04:00
  exit_local_dt: LocalDt;
  exit_ts: number; // Unix timestamp
  key: string;
  location: Geometry;
  origin_key: string;
  raw_places: ObjectId[];
  source: string;
  user_input: UserInput;
  starting_trip: ObjectId;
};

export type TripTransition = {
  currstate: string;
  transition: string | number;
  ts: number;
};

export type CompositeTripLocation = {
  loc: {
    coordinates: Position; // [lon, lat]
  };
  speed: number;
  ts: number;
};

//  Used for return type of readUnprocessedTrips
export type UnprocessedTrip = {
  _id: ObjectId;
  additions: []; // unprocessed trips won't have any matched processed inputs, so this is always empty
  ble_sensed_summary: SectionSummary;
  cleaned_section_summary: SectionSummary;
  confidence_threshold: number;
  distance: number;
  duration: number;
  end_fmt_time: string;
  end_loc: Point;
  end_local_dt: LocalDt;
  end_ts: number;
  expectation: { to_label: true }; // unprocessed trips are always expected to be labeled
  inferred_labels: []; // unprocessed trips won't have inferred labels
  inferred_section_summary: SectionSummary;
  key: 'UNPROCESSED_trip';
  locations?: CompositeTripLocation[];
  origin_key: 'UNPROCESSED_trip';
  sections: SectionData[];
  source: 'unprocessed';
  start_fmt_time: string;
  start_local_dt: LocalDt;
  start_ts: number;
  start_loc: Point;
  starting_trip?: any;
  user_input: {}; // unprocessed trips won't have any matched processed inputs, so this is always empty
};

/* These are the properties received from the server (basically matches Python code)
  This should match what Timeline.readAllCompositeTrips returns (an array of these objects) */
export type CompositeTrip = {
  _id: ObjectId;
  additions: UserInputEntry[];
  ble_sensed_summary: SectionSummary;
  cleaned_section_summary: SectionSummary;
  cleaned_trip: ObjectId;
  confidence_threshold: number;
  confirmed_trip: ObjectId;
  distance: number;
  duration: number;
  end_confirmed_place: BEMData<ConfirmedPlace>;
  end_fmt_time: string;
  end_loc: Point;
  end_local_dt: LocalDt;
  end_place: ObjectId;
  end_ts: number;
  expectation: { to_label: boolean };
  expected_trip: ObjectId;
  inferred_labels: InferredLabels;
  inferred_section_summary: SectionSummary;
  inferred_trip: ObjectId;
  key: string;
  locations: CompositeTripLocation[];
  origin_key: string;
  raw_trip: ObjectId;
  sections: SectionData[];
  source: string;
  start_confirmed_place: BEMData<ConfirmedPlace>;
  start_fmt_time: string;
  start_loc: Point;
  start_local_dt: LocalDt;
  start_place: ObjectId;
  start_ts: number;
  user_input: UserInput;
};

/* The 'timeline' for a user is a list of their trips and places,
 so a 'timeline entry' is either a trip or a place. */
export type TimelineEntry = ConfirmedPlace | CompositeTrip;

/* Type guard to disambiguate timeline entries as either trips or places
  If it has a 'start_ts' and 'end_ts', it's a trip. Else, it's a place. */
export const isTrip = (entry: TimelineEntry): entry is CompositeTrip =>
  entry.hasOwnProperty('start_ts') && entry.hasOwnProperty('end_ts');

export type TimestampRange = { start_ts: number; end_ts: number };

/* These properties aren't received from the server, but are derived from the above properties.
  They are used in the UI to display trip/place details and are computed by the useDerivedProperties hook. */
export type DerivedProperties = ReturnType<typeof useDerivedProperties>;

export type SectionSummary = {
  count: { [k: MotionTypeKey | BaseModeKey]: number };
  distance: { [k: MotionTypeKey | BaseModeKey]: number };
  duration: { [k: MotionTypeKey | BaseModeKey]: number };
};

export type InferredLabels = {
  p: number;
  labels: { [k in Lowercase<MultilabelKey> as `${k}_confirm`]?: string };
}[];

export type UserInputData = {
  end_ts: number;
  start_ts: number;
  label: string;
  start_local_dt?: LocalDt;
  end_local_dt?: LocalDt;
  status?: string;
  match_id?: string;
};
export type UserInputEntry<T = UserInputData> = {
  data: T;
  metadata: {
    time_zone: string;
    plugin: string;
    write_ts: number;
    platform: string;
    read_ts: number;
    key: string;
  };
  key?: string;
};

export type BluetoothBleData = {
  ts: number;
  eventType: 'REGION_ENTER' | 'REGION_EXIT' | 'RANGE_UPDATE' | number;
  uuid: string;
  major: number; // for our use case, missing for REGION_ENTER or REGION_EXIT
  minor: number; // for our use case, missing for REGION_ENTER or REGION_EXIT
  proximity?: string; // only available for RANGE_UPDATE
  rssi?: string; // only available for RANGE_UPDATE
  accuracy?: string; // only available for RANGE_UPDATE
};

export type Location = {
  speed: number;
  heading: number;
  local_dt: LocalDt;
  idx: number;
  section: ObjectId;
  longitude: number;
  latitude: number;
  fmt_time: string; // ISO
  mode: number;
  loc: Point;
  ts: number; // Unix
  altitude: number;
  distance: number;
};

export type SectionData = {
  _id: ObjectId;
  end_ts: number; // Unix time, e.x. 1696352498.804
  end_loc: Point;
  start_fmt_time: string; // ISO time
  end_fmt_time: string;
  key: string;
  origin_key: string;
  trip_id: ObjectId;
  ble_sensed_mode: VehicleIdentity;
  sensed_mode: number;
  source: string; // e.x., "SmoothedHighConfidenceMotion"
  start_ts: number; // Unix
  start_loc: Point;
  cleaned_section: ObjectId;
  start_local_dt: LocalDt;
  end_local_dt: LocalDt;
  sensed_mode_str: string; //e.x., "CAR"
  duration: number;
  distance: number;
};

// used in timelineHelper's `transitionTrip2UnprocessedTrip`
export type FilteredLocation = {
  accuracy: number;
  altitude: number;
  elapsedRealtimeNanos: number;
  filter: string;
  fmt_time: string;
  heading: number;
  latitude: number;
  loc: Geometry;
  local_dt: LocalDt;
  longitude: number;
  sensed_speed: number;
  ts: number;
};

export type GeoJSONStyledFeature = Feature<Geometry, any> & { style?: { color: string } };

export type GeoJSONData = {
  data: FeatureCollection & { id: string; properties: { start_ts: number; end_ts: number } };
};
