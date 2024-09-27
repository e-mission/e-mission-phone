import { DateTime } from 'luxon';
import { CompositeTrip } from '../types/diaryTypes';
import { LabelOptions } from '../types/labelTypes';
import { LocalDt } from '../types/serverData';
import { ImperialConfig } from '../config/useImperialConfig';
import { base_modes } from 'e-mission-common';
import { humanizeIsoRange } from '../datetimeUtil';

export type BaseModeKey = string; // TODO figure out how to get keyof typeof base_modes.BASE_MODES

// parallels the server-side MotionTypes enum: https://github.com/e-mission/e-mission-server/blob/94e7478e627fa8c171323662f951c611c0993031/emission/core/wrapper/motionactivity.py#L12
export type MotionTypeKey =
  | 'IN_VEHICLE'
  | 'BICYCLING'
  | 'ON_FOOT'
  | 'STILL'
  | 'UNKNOWN'
  | 'TILTING'
  | 'WALKING'
  | 'RUNNING'
  | 'NONE'
  | 'STOPPED_WHILE_IN_VEHICLE'
  | 'AIR_OR_HSR';

/**
 * @param trip A composite trip object
 * @returns An array of objects containing the mode key, icon, color, and percentage for each mode
 * detected in the trip
 */
export function getDetectedModes(trip: CompositeTrip) {
  const sectionSummary = trip?.inferred_section_summary || trip?.cleaned_section_summary;
  if (!sectionSummary?.distance) return [];

  return Object.entries(sectionSummary.distance)
    .sort(([modeA, distA]: [string, number], [modeB, distB]: [string, number]) => distB - distA) // sort by distance (highest first)
    .map(([mode, dist]: [MotionTypeKey, number]) => ({
      mode,
      icon: base_modes.get_base_mode_by_key(mode)?.icon,
      color: base_modes.get_base_mode_by_key(mode)?.color || 'black',
      pct: Math.round((dist / trip.distance) * 100) || '<1', // if rounds to 0%, show <1%
    }));
}

export function getFormattedSectionProperties(trip: CompositeTrip, imperialConfig: ImperialConfig) {
  return trip.sections?.map((s) => ({
    startTime: getLocalTimeString(s.start_local_dt),
    duration: humanizeIsoRange(s.start_fmt_time, s.end_fmt_time),
    distance: imperialConfig.getFormattedDistance(s.distance),
    distanceSuffix: imperialConfig.distanceSuffix,
    icon: base_modes.get_base_mode_by_key(s.sensed_mode_str)?.icon,
    color: base_modes.get_base_mode_by_key(s.sensed_mode_str)?.color || '#333',
  }));
}

/**
 * @param trip A composite trip object
 * @return the primary section of the trip, i.e. the section with the greatest distance
 */
export function primarySectionForTrip(trip: CompositeTrip) {
  if (!trip.sections?.length) return undefined;
  return trip.sections.reduce((prev, curr) => (prev.distance > curr.distance ? prev : curr));
}

export function getLocalTimeString(dt?: LocalDt) {
  if (!dt) return;
  const dateTime = DateTime.fromObject({
    hour: dt.hour,
    minute: dt.minute,
  });
  return dateTime.toLocaleString(DateTime.TIME_SIMPLE);
}
