// here we have some helper functions used throughout the label tab
// these functions are being gradually migrated out of services.js

import i18next from "i18next";
import moment from "moment";

type MotionType = {
  name: string,
  icon: string,
  color: string
}
const MotionTypes: {[k: string]: MotionType} = {
  IN_VEHICLE: { name: "IN_VEHICLE", icon: "speedometer", color: "purple" },
  ON_FOOT: { name: "ON_FOOT", icon: "walk", color: "brown" },
  BICYCLING: { name: "BICYCLING", icon: "bike", color: "green" },
  UNKNOWN: { name: "UNKNOWN", icon: "help", color: "orange" },
  WALKING: { name: "WALKING", icon: "walk", color: "brown" },
  CAR: { name: "CAR", icon: "car", color: "red" },
  AIR_OR_HSR: { name: "AIR_OR_HSR", icon: "airplane", color: "red" },
  // based on OSM routes/tags:
  BUS: { name: "BUS", icon: "bus-side", color: "red" },
  LIGHT_RAIL: { name: "LIGHT_RAIL", icon: "train-car-passenger", color: "red" },
  TRAIN: { name: "TRAIN", icon: "train-car-passenger", color: "red" },
  TRAM: { name: "TRAM", icon: "fas fa-tram", color: "red" },
  SUBWAY: { name: "SUBWAY", icon: "subway-variant", color: "red" },
  FERRY: { name: "FERRY", icon: "ferry", color: "red" },
  TROLLEYBUS: { name: "TROLLEYBUS", icon: "bus-side", color: "red" },
  UNPROCESSED: { name: "UNPROCESSED", icon: "help", color: "orange" }
}

type MotionTypeKey = keyof typeof MotionTypes;
/**
 * @param motionName A string like "WALKING" or "MotionTypes.WALKING"
 * @returns A MotionType object containing the name, icon, and color of the motion type
 */
export function motionTypeOf(motionName: MotionTypeKey | `MotionTypes.${MotionTypeKey}`) {
  let key = ('' + motionName).toUpperCase();
  key = key.split(".").pop(); // if "MotionTypes.WALKING", then just take "WALKING"
  return MotionTypes[motionName] || MotionTypes.UNKNOWN;
}

/**
 * @param beginTs Unix epoch timestamp in seconds
 * @param endTs Unix epoch timestamp in seconds
 * @returns true if the start and end timestamps fall on different days
 */
export function isMultiDay(beginTs: number, endTs: number) {
  if (!beginTs || !endTs) return false;
  return moment(beginTs * 1000).format('YYYYMMDD') != moment(endTs * 1000).format('YYYYMMDD');
}

/**
 * @param beginTs Unix epoch timestamp in seconds
 * @param endTs Unix epoch timestamp in seconds
 * @returns A formatted range if both params are defined, one formatted date if only one is defined
 * @example getFormattedDate(1683115200) => "Wed, May 3, 2023"
 */
export function getFormattedDate(beginTs: number, endTs?: number) {
  if (!beginTs && !endTs) return;
  if (isMultiDay(beginTs, endTs)) {
    return `${getFormattedDate(beginTs)} - ${getFormattedDate(endTs)}`;
  }
  // only one day given, or both are the same day
  const t = moment.unix(beginTs || endTs);
  // We use ddd LL to get Wed, May 3, 2023 or equivalent
  // LL only has the date, month and year
  // LLLL has the day of the week, but also the time
  return t.format('ddd LL');
}

/**
 * @param beginTs Unix epoch timestamp in seconds
 * @param endTs Unix epoch timestamp in seconds
 * @returns A formatted range if both params are defined, one formatted date if only one is defined
 * @example getFormattedDateAbbr(1683115200) => "Wed, May 3"
 */
export function getFormattedDateAbbr(beginTs: number, endTs?: number) {
  if (!beginTs && !endTs) return;
  if (isMultiDay(beginTs, endTs)) {
    return `${getFormattedDateAbbr(beginTs)} - ${getFormattedDateAbbr(endTs)}`;
  }
  // only one day given, or both are the same day
  const t = (beginTs || endTs) * 1000;
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  return Intl.DateTimeFormat(i18next.resolvedLanguage, opts).format(new Date(t));
}

// the rest is TODO, still in services.js
