// here we have some helper functions used throughout the label tab
// these functions are being gradually migrated out of services.js

import i18next from 'i18next';
import { DateTime } from 'luxon';
import { CompositeTrip } from '../types/diaryTypes';
import { LabelOptions } from '../types/labelTypes';
import humanizeDuration from 'humanize-duration';

export const modeColors = {
  pink: '#c32e85', // oklch(56% 0.2 350)     // e-car
  red: '#c21725', // oklch(52% 0.2 25)      // car
  orange: '#bf5900', // oklch(58% 0.16 50)     // air, hsr
  green: '#008148', // oklch(53% 0.14 155)    // bike, e-bike, moped
  blue: '#0074b7', // oklch(54% 0.14 245)    // walk
  periwinkle: '#6356bf', // oklch(52% 0.16 285)    // light rail, train, tram, subway
  magenta: '#9240a4', // oklch(52% 0.17 320)    // bus
  grey: '#555555', // oklch(45% 0 0)         // unprocessed / unknown
  taupe: '#7d585a', // oklch(50% 0.05 15)     // ferry, trolleybus, user-defined modes
};

type BaseMode = {
  name: string;
  icon: string;
  color: string;
};

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

const BaseModes: { [k: string]: BaseMode } = {
  // BEGIN MotionTypes
  IN_VEHICLE: { name: 'IN_VEHICLE', icon: 'speedometer', color: modeColors.red },
  BICYCLING: { name: 'BICYCLING', icon: 'bike', color: modeColors.green },
  ON_FOOT: { name: 'ON_FOOT', icon: 'walk', color: modeColors.blue },
  UNKNOWN: { name: 'UNKNOWN', icon: 'help', color: modeColors.grey },
  WALKING: { name: 'WALKING', icon: 'walk', color: modeColors.blue },
  AIR_OR_HSR: { name: 'AIR_OR_HSR', icon: 'airplane', color: modeColors.orange },
  // END MotionTypes
  CAR: { name: 'CAR', icon: 'car', color: modeColors.red },
  E_CAR: { name: 'E_CAR', icon: 'car-electric', color: modeColors.pink },
  E_BIKE: { name: 'E_BIKE', icon: 'bicycle-electric', color: modeColors.green },
  E_SCOOTER: { name: 'E_SCOOTER', icon: 'scooter-electric', color: modeColors.periwinkle },
  MOPED: { name: 'MOPED', icon: 'moped', color: modeColors.green },
  TAXI: { name: 'TAXI', icon: 'taxi', color: modeColors.red },
  BUS: { name: 'BUS', icon: 'bus-side', color: modeColors.magenta },
  AIR: { name: 'AIR', icon: 'airplane', color: modeColors.orange },
  LIGHT_RAIL: { name: 'LIGHT_RAIL', icon: 'train-car-passenger', color: modeColors.periwinkle },
  TRAIN: { name: 'TRAIN', icon: 'train-car-passenger', color: modeColors.periwinkle },
  TRAM: { name: 'TRAM', icon: 'fas fa-tram', color: modeColors.periwinkle },
  SUBWAY: { name: 'SUBWAY', icon: 'subway-variant', color: modeColors.periwinkle },
  FERRY: { name: 'FERRY', icon: 'ferry', color: modeColors.taupe },
  TROLLEYBUS: { name: 'TROLLEYBUS', icon: 'bus-side', color: modeColors.taupe },
  UNPROCESSED: { name: 'UNPROCESSED', icon: 'help', color: modeColors.grey },
  OTHER: { name: 'OTHER', icon: 'pencil-circle', color: modeColors.taupe },
};

export type BaseModeKey = keyof typeof BaseModes;
/**
 * @param motionName A string like "WALKING" or "MotionTypes.WALKING"
 * @returns A BaseMode object containing the name, icon, and color of the motion type
 */
export function getBaseModeByKey(
  motionName: BaseModeKey | MotionTypeKey | `MotionTypes.${MotionTypeKey}`,
) {
  let key = ('' + motionName).toUpperCase();
  key = key.split('.').pop(); // if "MotionTypes.WALKING", then just take "WALKING"
  return BaseModes[key] || BaseModes.UNKNOWN;
}

export function getBaseModeByValue(value, labelOptions: LabelOptions) {
  const modeOption = labelOptions?.MODE?.find((opt) => opt.value == value);
  return getBaseModeByKey(modeOption?.baseMode || 'OTHER');
}

export function getBaseModeByText(text, labelOptions: LabelOptions) {
  const modeOption = labelOptions?.MODE?.find((opt) => opt.text == text);
  return getBaseModeByKey(modeOption?.baseMode || 'OTHER');
}

/**
 * @param beginFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @param endTs An ISO 8601 formatted timestamp (with timezone)
 * @returns true if the start and end timestamps fall on different days
 * @example isMultiDay("2023-07-13T00:00:00-07:00", "2023-07-14T00:00:00-07:00") => true
 */
export function isMultiDay(beginFmtTime: string, endFmtTime: string) {
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
export function getFormattedDate(beginFmtTime: string, endFmtTime?: string) {
  if (!beginFmtTime && !endFmtTime) return;
  if (isMultiDay(beginFmtTime, endFmtTime)) {
    return `${getFormattedDate(beginFmtTime)} - ${getFormattedDate(endFmtTime)}`;
  }
  // only one day given, or both are the same day
  const t = DateTime.fromISO(beginFmtTime || endFmtTime, { setZone: true });
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
export function getFormattedDateAbbr(beginFmtTime: string, endFmtTime?: string) {
  if (!beginFmtTime && !endFmtTime) return;
  if (isMultiDay(beginFmtTime, endFmtTime)) {
    return `${getFormattedDateAbbr(beginFmtTime)} - ${getFormattedDateAbbr(endFmtTime)}`;
  }
  // only one day given, or both are the same day
  const dt = DateTime.fromISO(beginFmtTime || endFmtTime, { setZone: true });
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
    language: i18next.language,
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
    .sort(([modeA, distA], [modeB, distB]) => distB - distA) // sort by distance (highest first)
    .map(([mode, dist]: [MotionTypeKey, number]) => ({
      mode,
      icon: getBaseModeByKey(mode)?.icon,
      color: getBaseModeByKey(mode)?.color || 'black',
      pct: Math.round((dist / trip.distance) * 100) || '<1', // if rounds to 0%, show <1%
    }));
}

export function getFormattedSectionProperties(trip, ImperialConfig) {
  return trip.sections?.map((s) => ({
    startTime: getLocalTimeString(s.start_local_dt),
    duration: getFormattedTimeRange(s.start_fmt_time, s.end_fmt_time),
    distance: ImperialConfig.getFormattedDistance(s.distance),
    distanceSuffix: ImperialConfig.distanceSuffix,
    icon: getBaseModeByKey(s.sensed_mode_str)?.icon,
    color: getBaseModeByKey(s.sensed_mode_str)?.color || '#333',
  }));
}

export function getLocalTimeString(dt) {
  if (!dt) return;
  const dateTime = DateTime.fromObject({
    hour: dt.hour,
    minute: dt.minute,
  });
  return dateTime.toLocaleString(DateTime.TIME_SIMPLE);
}
