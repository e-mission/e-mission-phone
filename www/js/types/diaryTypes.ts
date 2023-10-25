/* These type definitions are a work in progress. The goal is to have a single source of truth for
    the types of the trip / place / untracked objects and all properties they contain.
  Since we are using TypeScript now, we should strive to enforce type safety and also benefit from
    IntelliSense and other IDE features. */

import { BaseModeKey, MotionTypeKey } from "../diary/diaryHelper";

// Since it is WIP, these types are not used anywhere yet.

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
  user_input: UserInput, 
}

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

/* These are the properties that are still filled in by some kind of 'populate' mechanism.
  It would simplify the codebase to just compute them where they're needed
  (using memoization when apt so performance is not impacted). */
export type PopulatedTrip = CompositeTrip & {
  additionsList?: any[], // TODO
  finalInference?: any, // TODO
  geojson?: any, // TODO
  getNextEntry?: () => PopulatedTrip | ConfirmedPlace,
  userInput?: UserInput, 
  verifiability?: string,
}

export type SectionSummary = {
  count: {[k: MotionTypeKey | BaseModeKey]: number},
  distance: {[k: MotionTypeKey | BaseModeKey]: number},
  duration: {[k: MotionTypeKey | BaseModeKey]: number},
}

export type UserInput = {
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

export type Trip = {
  end_ts: number,
  start_ts: number,
}

export type TlEntry = {
  key: string,
  origin_key: string,
  start_ts: number,
  end_ts: number,
  enter_ts: number,
  exit_ts: number,
  duration: number,
  getNextEntry?: () => PopulatedTrip | ConfirmedPlace,
}
