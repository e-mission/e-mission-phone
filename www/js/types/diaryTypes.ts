import { LocalDt, ServerData } from './serverData';

export type UserInput = ServerData<UserInputData>;

export type UserInputData = {
  end_ts: number;
  start_ts: number;
  label: string;
  start_local_dt?: LocalDt;
  end_local_dt?: LocalDt;
  status?: string;
  match_id?: string;
};

export type TripTransition = {
  currstate: string;
  transition: string;
  ts: number;
};

export type ObjId = {
  $oid: string; // objIds have len 24
};

export type LocationCoord = {
  type: string; // e.x., "Point"
  coordinates: [number, number];
};

type ConfirmedPlace = {
  cleaned_place: {
    string;
  };
  additions: Array<any>; // Todo
  ender_local_dt: LocalDt;
  starting_trip: ObjId;
  exit_fmt_time: string; // ISO
  exit_local_dt: LocalDt;
  enter_ts: number;
  source: string;
  enter_fmt_time: string;
  raw_places: Array<ObjId>;
  location: LocationCoord;
  exit_ts: number;
  ending_trip: ObjId;
  user_input: {}; //todo
};

export type CompositeTrip = {
  _id: ObjId;
  additions: any[]; // TODO
  cleaned_section_summary: any; // TODO
  cleaned_trip: ObjId;
  confidence_threshold: number;
  confirmed_trip: ObjId;
  distance: number;
  duration: number;
  end_confirmed_place: ConfirmedPlace;
  end_fmt_time: string;
  end_loc: { type: string; coordinates: number[] };
  end_local_dt: LocalDt;
  end_place: ObjId;
  end_ts: number;
  expectation: any; // TODO "{to_label: boolean}"
  expected_trip: ObjId;
  inferred_labels: any[]; // TODO
  inferred_section_summary: any; // TODO
  inferred_trip: ObjId;
  key: string;
  locations: any[]; // TODO
  origin_key: string;
  raw_trip: ObjId;
  sections: any[]; // TODO
  source: string;
  start_confirmed_place: ConfirmedPlace;
  start_fmt_time: string;
  start_loc: { type: string; coordinates: number[] };
  start_local_dt: LocalDt;
  start_place: ObjId;
  start_ts: number;
  user_input: UserInput;
};

export type PopulatedTrip = CompositeTrip & {
  additionsList?: any[]; // TODO
  finalInference?: any; // TODO
  geojson?: any; // TODO
  getNextEntry?: () => PopulatedTrip | ConfirmedPlace;
  userInput?: UserInput;
  verifiability?: string;
};

export type Trip = {
  end_ts: number;
  start_ts: number;
};

export type TlEntry = {
  key: string;
  origin_key: string;
  start_ts: number;
  end_ts: number;
  enter_ts: number;
  exit_ts: number;
  duration: number;
  getNextEntry?: () => PopulatedTrip | ConfirmedPlace;
};

export type Location = {
  speed: number;
  heading: number;
  local_dt: LocalDt;
  idx: number;
  section: ObjId;
  longitude: number;
  latitude: number;
  fmt_time: string; // ISO
  mode: number;
  loc: LocationCoord;
  ts: number; // Unix
  altitude: number;
  distance: number;
};

// used in readAllCompositeTrips
export type SectionData = {
  end_ts: number; // Unix time, e.x. 1696352498.804
  end_loc: LocationCoord;
  start_fmt_time: string; // ISO time
  end_fmt_time: string;
  trip_id: ObjId;
  sensed_mode: number;
  source: string; // e.x., "SmoothedHighConfidenceMotion"
  start_ts: number; // Unix
  start_loc: LocationCoord;
  cleaned_section: ObjId;
  start_local_dt: LocalDt;
  end_local_dt: LocalDt;
  sensed_mode_str: string; //e.x., "CAR"
  duration: number;
  distance: number;
};
