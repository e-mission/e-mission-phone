import i18next from 'i18next';
import { DateTime } from 'luxon';
import humanizeDuration from 'humanize-duration';

/* formatting units for display:
  - if value >= 100, round to the nearest integer
   e.g. "105 mi", "119 kmph"
  - if 10 <= value < 100, round to 1 decimal place
    e.g. "77.2 km", "11.3 mph"
  - if value < 10, round to 2 decimal places
    e.g. "7.27 mi", "0.75 km" */
export function formatForDisplay(value: number, opts: Intl.NumberFormatOptions = {}): string {
  if (value >= 100) opts.maximumFractionDigits ??= 0;
  else if (value >= 10) opts.maximumFractionDigits ??= 1;
  else opts.maximumFractionDigits ??= 2;
  return Intl.NumberFormat(i18next.resolvedLanguage, opts).format(value);
}

/**
 * @param isoStr1 An ISO 8601 string (with/without timezone)
 * @param isoStr2 An ISO 8601 string (with/without timezone)
 * @param opts Intl.DateTimeFormatOptions for formatting (optional, defaults to { weekday: 'short', month: 'short', day: 'numeric' })
 * @returns A formatted range if both params are defined, one formatted date if only one is defined
 * @example getFormattedDate("2023-07-14T00:00:00-07:00") => "Jul 14, 2023"
 * @example getFormattedDate("2023-07-14", "2023-07-15") => "Jul 14, 2023 - Jul 15, 2023"
 */
export function formatIso(isoStr1?: string, isoStr2?: string, opts?: Intl.DateTimeFormatOptions) {
  if (!isoStr1 && !isoStr2) return;
  // both dates are given and are different, show a range
  if (isoStr1 && isoStr2 && isoStr1.substring(0, 10) != isoStr2.substring(0, 10)) {
    // separate the two dates with an en dash
    return `${formatIso(isoStr1, undefined, opts)} – ${formatIso(isoStr2, undefined, opts)}`;
  }
  const isoStr = isoStr1 || isoStr2 || '';
  // only one day given, or both are the same day, show a single date
  const dt = DateTime.fromISO(isoStr, { setZone: true });
  if (!dt.isValid) return isoStr;
  return dt.toLocaleString(opts ?? { month: 'short', day: 'numeric', year: 'numeric' });
}

export const formatIsoNoYear = (isoStr1?: string, isoStr2?: string) =>
  formatIso(isoStr1, isoStr2, { month: 'short', day: 'numeric' });

export const formatIsoWeekday = (isoStr1?: string, isoStr2?: string) =>
  formatIso(isoStr1, isoStr2, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatIsoWeekdayNoYear = (isoStr1?: string, isoStr2?: string) =>
  formatIso(isoStr1, isoStr2, { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * @example IsoDateWithOffset('2024-03-22', 1) -> '2024-03-23'
 * @example IsoDateWithOffset('2024-03-22', -1000) -> '2021-06-26'
 */
export function isoDateWithOffset(date: string, offset: number) {
  let d = new Date(date);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().substring(0, 10);
}

export const isoDateRangeToTsRange = (isoDateRange: [string, string], zone?) => [
  DateTime.fromISO(isoDateRange[0], { zone: zone }).startOf('day').toSeconds(),
  DateTime.fromISO(isoDateRange[1], { zone: zone }).endOf('day').toSeconds(),
];

/**
 * @example isoDatesDifference('2024-03-22', '2024-03-29') -> 7
 * @example isoDatesDifference('2024-03-22', '2021-06-26') -> 1000
 * @example isoDatesDifference('2024-03-29', '2024-03-25') -> -4
 */
export const isoDatesDifference = (isoStr1: string, isoStr2: string) =>
  -DateTime.fromISO(isoStr1).diff(DateTime.fromISO(isoStr2), 'days').days;

/**
 * @param isoStr1 An ISO 8601 formatted timestamp (with timezone)
 * @param isoStr2 An ISO 8601 formatted timestamp (with timezone)
 * @returns A human-readable, approximate time range, e.g. "2 hours"
 */
export function humanizeIsoRange(isoStr1: string, isoStr2: string) {
  if (!isoStr1 || !isoStr2) return;
  const beginTime = DateTime.fromISO(isoStr1, { setZone: true });
  const endTime = DateTime.fromISO(isoStr2, { setZone: true });
  const range = endTime.diff(beginTime, ['hours', 'minutes']);
  return humanizeDuration(range.as('milliseconds'), {
    language: i18next.resolvedLanguage,
    largest: 1,
    round: true,
  });
}
