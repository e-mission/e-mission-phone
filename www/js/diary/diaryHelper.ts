// here we have some helper functions used throughout the label tab
// these functions are being gradually migrated out of services.js

import moment from "moment";
import { DateTime } from "luxon";
import { LabelOptions, readableLabelToKey } from "../survey/multilabel/confirmHelper";

export const modeColors = {
  pink: '#c32e85',        // oklch(56% 0.2 350)     // e-car
  red: '#c21725',         // oklch(52% 0.2 25)      // car
  orange: '#bf5900',      // oklch(58% 0.16 50)     // air, hsr
  green: '#008148',       // oklch(53% 0.14 155)    // bike, e-bike, moped
  blue: '#0074b7',        // oklch(54% 0.14 245)    // walk
  periwinkle: '#6356bf',  // oklch(52% 0.16 285)    // light rail, train, tram, subway
  magenta: '#9240a4',     // oklch(52% 0.17 320)    // bus
  grey: '#555555',        // oklch(45% 0 0)         // unprocessed / unknown
  taupe: '#7d585a',       // oklch(50% 0.05 15)     // ferry, trolleybus, user-defined modes
}

type BaseMode = {
  name: string,
  icon: string,
  color: string
}

// parallels the server-side MotionTypes enum: https://github.com/e-mission/e-mission-server/blob/94e7478e627fa8c171323662f951c611c0993031/emission/core/wrapper/motionactivity.py#L12
type MotionTypeKey = 'IN_VEHICLE' | 'BICYCLING' | 'ON_FOOT' | 'STILL' | 'UNKNOWN' | 'TILTING'
                  | 'WALKING' | 'RUNNING' | 'NONE' | 'STOPPED_WHILE_IN_VEHICLE' | 'AIR_OR_HSR';

const BaseModes: {[k: string]: BaseMode} = {
  // BEGIN MotionTypes
  IN_VEHICLE: { name: "IN_VEHICLE", icon: "speedometer", color: modeColors.red },
  BICYCLING: { name: "BICYCLING", icon: "bike", color: modeColors.green },
  ON_FOOT: { name: "ON_FOOT", icon: "walk", color: modeColors.blue },
  UNKNOWN: { name: "UNKNOWN", icon: "help", color: modeColors.grey },
  WALKING: { name: "WALKING", icon: "walk", color: modeColors.blue },
  AIR_OR_HSR: { name: "AIR_OR_HSR", icon: "airplane", color: modeColors.orange },
  // END MotionTypes
  CAR: { name: "CAR", icon: "car", color: modeColors.red },
  E_CAR: { name: "E_CAR", icon: "car-electric", color: modeColors.pink },
  E_BIKE: { name: "E_BIKE", icon: "bicycle-electric", color: modeColors.green },
  E_SCOOTER: { name: "E_SCOOTER", icon: "scooter-electric", color: modeColors.periwinkle },
  MOPED: { name: "MOPED", icon: "moped", color: modeColors.green },
  TAXI: { name: "TAXI", icon: "taxi", color: modeColors.red },
  BUS: { name: "BUS", icon: "bus-side", color: modeColors.magenta },
  AIR: { name: "AIR", icon: "airplane", color: modeColors.orange },
  LIGHT_RAIL: { name: "LIGHT_RAIL", icon: "train-car-passenger", color: modeColors.periwinkle },
  TRAIN: { name: "TRAIN", icon: "train-car-passenger", color: modeColors.periwinkle },
  TRAM: { name: "TRAM", icon: "fas fa-tram", color: modeColors.periwinkle },
  SUBWAY: { name: "SUBWAY", icon: "subway-variant", color: modeColors.periwinkle },
  FERRY: { name: "FERRY", icon: "ferry", color: modeColors.taupe },
  TROLLEYBUS: { name: "TROLLEYBUS", icon: "bus-side", color: modeColors.taupe },
  UNPROCESSED: { name: "UNPROCESSED", icon: "help", color: modeColors.grey },
  OTHER: { name: "OTHER", icon: "pencil-circle", color: modeColors.taupe },
};

type BaseModeKey = keyof typeof BaseModes;
/**
 * @param motionName A string like "WALKING" or "MotionTypes.WALKING"
 * @returns A BaseMode object containing the name, icon, and color of the motion type
 */
export function getBaseModeByKey(motionName: BaseModeKey | MotionTypeKey | `MotionTypes.${MotionTypeKey}`) {
  let key = ('' + motionName).toUpperCase();
  key = key.split(".").pop(); // if "MotionTypes.WALKING", then just take "WALKING"
  return BaseModes[key] || BaseModes.UNKNOWN;
}

export function getBaseModeOfLabeledTrip(trip, labelOptions) {
  const modeKey = trip?.userInput?.MODE?.value;
  if (!modeKey) return null; // trip has no MODE label
  const modeOption = labelOptions?.MODE?.find(opt => opt.value == modeKey);
  return getBaseModeByKey(modeOption?.baseMode || "OTHER");
}

export function getBaseModeByValue(value, labelOptions: LabelOptions) {
  const modeOption = labelOptions?.MODE?.find(opt => opt.value == value);
  return getBaseModeByKey(modeOption?.baseMode || "OTHER");
}

export function getBaseModeByText(text, labelOptions: LabelOptions) {
  const modeOption = labelOptions?.MODE?.find(opt => opt.text == text);
  return getBaseModeByKey(modeOption?.baseMode || "OTHER");
}

/**
 * @param beginFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @param endTs An ISO 8601 formatted timestamp (with timezone)
 * @returns true if the start and end timestamps fall on different days
 * @example isMultiDay("2023-07-13T00:00:00-07:00", "2023-07-14T00:00:00-07:00") => true
 */
export function isMultiDay(beginFmtTime: string, endFmtTime: string) {
  if (!beginFmtTime || !endFmtTime) return false;
  return moment.parseZone(beginFmtTime).format('YYYYMMDD') != moment.parseZone(endFmtTime).format('YYYYMMDD');
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
  const t = moment.parseZone(beginFmtTime || endFmtTime);
  // We use ddd LL to get Wed, May 3, 2023 or equivalent
  // LL only has the date, month and year
  // LLLL has the day of the week, but also the time
  return t.format('ddd LL');
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
  const beginMoment = moment.parseZone(beginFmtTime);
  const endMoment = moment.parseZone(endFmtTime);
  return endMoment.to(beginMoment, true);
};

// Temporary function to avoid repear in getDetectedModes ret val.
const filterRunning = (mode) =>
  (mode == 'MotionTypes.RUNNING') ? 'MotionTypes.WALKING' : mode;

export function getDetectedModes(trip) {
  if (!trip.sections?.length) return [];

  // sum up the distances for each mode, as well as the total distance
  let totalDist = 0;
  const dists: Record<string, number> = {};
  trip.sections.forEach((section) => {
    const filteredMode = filterRunning(section.sensed_mode_str);
    dists[filteredMode] = (dists[filteredMode] || 0) + section.distance;
    totalDist += section.distance;
  });

  // sort modes by the distance traveled (descending)
  const sortedKeys = Object.entries(dists).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  let sectionPcts = sortedKeys.map(function (mode) {
    const fract = dists[mode] / totalDist;
    return {
      mode: mode,
      icon: getBaseModeByKey(mode)?.icon,
      color: getBaseModeByKey(mode)?.color || 'black',
      pct: Math.round(fract * 100) || '<1' // if rounds to 0%, show <1%
    };
  });

  return sectionPcts;
}

export function getFormattedSectionProperties(trip, ImperialConfig) {
  return trip.sections?.map((s) => ({
    startTime: getLocalTimeString(s.start_local_dt),
    duration: getFormattedTimeRange(s.start_fmt_time, s.end_fmt_time),
    distance: ImperialConfig.getFormattedDistance(s.distance),
    distanceSuffix: ImperialConfig.distanceSuffix,
    icon: getBaseModeByKey(s.sensed_mode_str)?.icon,
    color: getBaseModeByKey(s.sensed_mode_str)?.color || "#333",
  }));
}

export function getLocalTimeString(dt) {
  if (!dt) return;
  /* correcting the date of the processed trips knowing that local_dt months are from 1 -> 12
    and for the moment function they need to be between 0 -> 11 */
  const mdt = { ...dt, month: dt.month-1 };
  return moment(mdt).format("LT");
}
