// here we have some helper functions used throughout the label tab
// these functions are being gradually migrated out of services.js

import i18next from 'i18next';
import { DateTime } from 'luxon';
import { CompositeTrip } from '../types/diaryTypes';
import { LabelOptions } from '../types/labelTypes';
import { LocalDt } from '../types/serverData';
import humanizeDuration from 'humanize-duration';
import { AppConfig } from '../types/appConfigTypes';
import { ImperialConfig } from '../config/useImperialConfig';
import { base_modes } from 'e-mission-common';

export const modeColors = base_modes.mode_colors;

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

const BaseModes = base_modes.BASE_MODES;

export function getBaseModeByValue(value: string, labelOptions: LabelOptions) {
  const modeOption = labelOptions?.MODE?.find((opt) => opt.value == value);
  return base_modes.get_base_mode_by_key(modeOption?.baseMode || 'OTHER');
}

export function getBaseModeByText(text: string, labelOptions: LabelOptions) {
  const modeOption = labelOptions?.MODE?.find((opt) => opt.text == text);
  return base_modes.get_base_mode_by_key(modeOption?.baseMode || 'OTHER');
}

/**
 * @param beginFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @param endTs An ISO 8601 formatted timestamp (with timezone)
 * @returns true if the start and end timestamps fall on different days
 * @example isMultiDay("2023-07-13T00:00:00-07:00", "2023-07-14T00:00:00-07:00") => true
 */
export function isMultiDay(beginFmtTime?: string, endFmtTime?: string) {
  if (!beginFmtTime || !endFmtTime) return false;
  return (
    DateTime.fromISO(beginFmtTime, { setZone: true }).toFormat('YYYYMMDD') !=
    DateTime.fromISO(endFmtTime, { setZone: true }).toFormat('YYYYMMDD')
  );
}

/**
 * @param beginFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @param endTs An ISO 8601 formatted timestamp (with timezone)
 * @returns A formatted range if both params are defined, one formatted date if only one is defined
 * @example getFormattedDate("2023-07-14T00:00:00-07:00") => "Fri, Jul 14, 2023"
 */
export function getFormattedDate(beginFmtTime?: string, endFmtTime?: string) {
  if (!beginFmtTime && !endFmtTime) return;
  if (isMultiDay(beginFmtTime, endFmtTime)) {
    return `${getFormattedDate(beginFmtTime)} - ${getFormattedDate(endFmtTime)}`;
  }
  // only one day given, or both are the same day
  const t = DateTime.fromISO(beginFmtTime || endFmtTime || '', { setZone: true });
  // We use toLocale to get Wed May 3, 2023 or equivalent,
  const tConversion = t.toLocaleString({
    weekday: 'short',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });
  return tConversion;
}

/**
 * @param beginFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @param endTs An ISO 8601 formatted timestamp (with timezone)
 * @returns A formatted range if both params are defined, one formatted date if only one is defined
 * @example getFormattedDate("2023-07-14T00:00:00-07:00") => "Fri, Jul 14"
 */
export function getFormattedDateAbbr(beginFmtTime?: string, endFmtTime?: string) {
  if (!beginFmtTime && !endFmtTime) return;
  if (isMultiDay(beginFmtTime, endFmtTime)) {
    return `${getFormattedDateAbbr(beginFmtTime)} - ${getFormattedDateAbbr(endFmtTime)}`;
  }
  // only one day given, or both are the same day
  const dt = DateTime.fromISO(beginFmtTime || endFmtTime || '', { setZone: true });
  return dt.toLocaleString({ weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * @param beginFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @param endFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @returns A human-readable, approximate time range, e.g. "2 hours"
 */
export function getFormattedTimeRange(beginFmtTime: string, endFmtTime: string) {
  if (!beginFmtTime || !endFmtTime) return;
  const beginTime = DateTime.fromISO(beginFmtTime, { setZone: true });
  const endTime = DateTime.fromISO(endFmtTime, { setZone: true });
  const range = endTime.diff(beginTime, ['hours', 'minutes']);
  return humanizeDuration(range.as('milliseconds'), {
    language: i18next.resolvedLanguage,
    largest: 1,
    round: true,
  });
}

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
    duration: getFormattedTimeRange(s.start_fmt_time, s.end_fmt_time),
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
