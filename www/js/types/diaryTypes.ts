/* This file provides typings for use in '/diary', including timeline objects (trips and places)
 and user input objects.
 As much as possible, these types parallel the types used in the server code. */

import { BaseModeKey, MotionTypeKey } from "../diary/diaryHelper";

type ConfirmedPlace = any; // TODO

/* These are the properties received from the server (basically matches Python code)
  This should match what Timeline.readAllCompositeTrips returns (an array of these objects) */
export type CompositeTrip = {
  _id: {$oid: string},
  additions: any[], // TODO
  cleaned_section_summary: SectionSummary,
  cleaned_trip: {$oid: string},
  confidence_threshold: number,
  confirmed_trip: {$oid: string},
  distance: number,
  duration: number,
  end_confirmed_place: ConfirmedPlace,
  end_fmt_time: string,
  end_loc: {type: string, coordinates: number[]},
  end_local_dt: LocalDt, 
  end_place: {$oid: string},
  end_ts: number,
  expectation: any, // TODO "{to_label: boolean}"
  expected_trip: {$oid: string},
  inferred_labels: any[], // TODO
  inferred_section_summary: SectionSummary,
  inferred_trip: {$oid: string},
  key: string,
  locations: any[], // TODO
  origin_key: string,
  raw_trip: {$oid: string},
  sections: any[], // TODO
  source: string,
  start_confirmed_place: ConfirmedPlace,
  start_fmt_time: string,
  start_loc: {type: string, coordinates: number[]},
  start_local_dt: LocalDt, 
  start_place: {$oid: string},
  start_ts: number,
  user_input: UnprocessedUserInput, 
}

/* The 'timeline' for a user is a list of their trips and places,
 so a 'timeline entry' is either a trip or a place. */
export type TimelineEntry = ConfirmedPlace | CompositeTrip;

/* These properties aren't received from the server, but are derived from the above properties.
  They are used in the UI to display trip/place details and are computed by the useDerivedProperties hook. */
export type DerivedProperties = {
  displayDate: string,
  displayStartTime: string,
  displayEndTime: string,
  displayTime: string,
  displayStartDateAbbr: string,
  displayEndDateAbbr: string,
  formattedDistance: string,
  formattedSectionProperties: any[], // TODO
  distanceSuffix: string,
  detectedModes: { mode: string, icon: string, color: string, pct: number|string }[],
}

export type SectionSummary = {
  count: {[k: MotionTypeKey | BaseModeKey]: number},
  distance: {[k: MotionTypeKey | BaseModeKey]: number},
  duration: {[k: MotionTypeKey | BaseModeKey]: number},
}

export type UnprocessedUserInput = {
  data: {
      end_ts: number,
      start_ts: number
      label: string,
      start_local_dt?: LocalDt
      end_local_dt?: LocalDt
      status?: string,
      match_id?: string,
  },
  metadata: {
      time_zone: string,
      plugin: string,
      write_ts: number,
      platform: string,
      read_ts: number,
      key: string,
  },
  key?: string
}

export type LocalDt = {
  minute: number,
  hour: number,
  second: number,
  day: number,
  weekday: number,
  month: number,
  year: number,
  timezone: string,
}
