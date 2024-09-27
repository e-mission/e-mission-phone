import { DateTime } from 'luxon';
import color from 'color';
import { DayOfMetricData, MetricEntry, MetricValue } from './metricsTypes';
import { logDebug } from '../plugin/logger';
import { MetricName, groupingFields } from '../types/appConfigTypes';
import { ImperialConfig } from '../config/useImperialConfig';
import i18next from 'i18next';
import { base_modes, metrics_summaries } from 'e-mission-common';
import {
  formatForDisplay,
  formatIsoNoYear,
  isoDatesDifference,
  isoDateWithOffset,
} from '../datetimeUtil';
import { LabelOptions, RichMode } from '../types/labelTypes';
import { labelOptions, textToLabelKey } from '../survey/multilabel/confirmHelper';
import { UNCERTAIN_OPACITY } from '../components/charting';

export function getUniqueLabelsForDays(metricDataDays: DayOfMetricData[]) {
  const uniqueLabels: string[] = [];
  metricDataDays.forEach((e) => {
    Object.keys(e).forEach((k) => {
      const trimmed = trimGroupingPrefix(k);
      if (trimmed && !uniqueLabels.includes(trimmed)) {
        uniqueLabels.push(trimmed);
      }
    });
  });
  return uniqueLabels;
}

/**
 * @description Trims the "grouping field" prefix from a metrics key. Grouping fields are defined in appConfigTypes.ts
 * @example removeGroupingPrefix('mode_purpose_access_recreation') => 'access_recreation'
 * @example removeGroupingPrefix('primary_ble_sensed_mode_CAR') => 'CAR'
 * @returns The key without the prefix (or undefined if the key didn't start with a grouping field)
 */
export const trimGroupingPrefix = (label: string) => {
  for (let field of groupingFields) {
    if (label.startsWith(field)) {
      return label.substring(field.length + 1);
    }
  }
  return '';
};

export const getLabelsForDay = (metricDataDay: DayOfMetricData) =>
  Object.keys(metricDataDay).reduce((acc, k) => {
    const trimmed = trimGroupingPrefix(k);
    if (trimmed) acc.push(trimmed);
    return acc;
  }, [] as string[]);

export const secondsToMinutes = (seconds: number) => seconds / 60;
export const secondsToHours = (seconds: number) => seconds / 3600;

// segments metricsDays into weeks, with the most recent week first
export function segmentDaysByWeeks(days: DayOfMetricData[], lastDate: string) {
  const weeks: DayOfMetricData[][] = [[]];
  let cutoff = isoDateWithOffset(lastDate, -7 * weeks.length);
  for (let i = days.length - 1; i >= 0; i--) {
    // if date is older than cutoff, start a new week
    while (isoDatesDifference(days[i].date, cutoff) >= 0) {
      weeks.push([]);
      cutoff = isoDateWithOffset(lastDate, -7 * weeks.length);
    }
    weeks[weeks.length - 1].push(days[i]);
  }
  return weeks.map((week) => week.reverse());
}

export const formatDate = (day: DayOfMetricData) => formatIsoNoYear(day.date);

export function formatDateRangeOfDays(days: DayOfMetricData[]) {
  if (!days?.length) return '';
  const startIsoDate = days[0].date;
  const endIsoDate = days[days.length - 1].date;
  return formatIsoNoYear(startIsoDate, endIsoDate);
}

export function getActiveModes(labelOptions: LabelOptions) {
  return labelOptions.MODE.filter((mode) => {
    const richMode = base_modes.get_rich_mode(mode) as RichMode;
    return richMode.met && Object.values(richMode.met).some((met) => met?.mets || -1 > 0);
  }).map((mode) => mode.value);
}

//from two weeks fo low and high values, calculates low and high change
export function calculatePercentChange(pastWeekRange, previousWeekRange) {
  let greaterLesserPct = {
    low: (pastWeekRange.low / previousWeekRange.low) * 100 - 100,
    high: (pastWeekRange.high / previousWeekRange.high) * 100 - 100,
  };
  return greaterLesserPct;
}

const _datesTsCache = {};
export const tsForDayOfMetricData = (day: DayOfMetricData) => {
  if (_datesTsCache[day.date] == undefined)
    _datesTsCache[day.date] = DateTime.fromISO(day.date).toSeconds();
  return _datesTsCache[day.date];
};

export const valueForFieldOnDay = (day: MetricEntry, field: string, key: string) =>
  day[`${field}_${key}`];

// [unit suffix, unit conversion function, unit display function]
// e.g. ['hours', (seconds) => seconds/3600, (seconds) => seconds/3600 + ' hours']
type UnitUtils = [string, (v) => number, (v) => string];
export function getUnitUtilsForMetric(
  metricName: MetricName,
  imperialConfig: ImperialConfig,
): UnitUtils {
  const fns: { [k in MetricName]: UnitUtils } = {
    distance: [
      imperialConfig.distanceSuffix,
      (x) => imperialConfig.convertDistance(x),
      (x) => imperialConfig.getFormattedDistance(x) + ' ' + imperialConfig.distanceSuffix,
    ],
    duration: [
      i18next.t('metrics.travel.hours'),
      (v) => secondsToHours(v),
      (v) => formatForDisplay(secondsToHours(v)) + ' ' + i18next.t('metrics.travel.hours'),
    ],
    count: [
      i18next.t('metrics.travel.trips'),
      (v) => v,
      (v) => v + ' ' + i18next.t('metrics.travel.trips'),
    ],
    response_count: [
      i18next.t('metrics.surveys.responses'),
      (v) => v.responded || 0,
      (v) => {
        const responded = v.responded || 0;
        const total = responded + (v.not_responded || 0);
        return `${responded}/${total} ${i18next.t('metrics.surveys.responses')}`;
      },
    ],
    footprint: [] as any, // TODO
  };
  return fns[metricName];
}

/**
 * @param entries an array of metric entries
 * @param metricName the metric that the values are for
 * @returns a metric entry with fields of the same name summed across all entries
 */
export function aggMetricEntries<T extends MetricName>(entries: MetricEntry<T>[], metricName: T) {
  let acc = {};
  entries?.forEach((e) => {
    for (let field in e) {
      if (groupingFields.some((f) => field.startsWith(f))) {
        acc[field] = metrics_summaries.acc_value_of_metric(metricName, acc?.[field], e[field]);
      } else if (field == 'nUsers') {
        acc[field] = (acc[field] || 0) + e[field];
      }
    }
  });
  return acc as MetricEntry<T extends `${infer U}` ? U : never>;
}

/**
 * @param a metric entry
 * @param metricName the metric that the values are for
 * @returns the result of summing the values across all fields in the entry
 */
export function sumMetricEntry<T extends MetricName>(entry: MetricEntry<T>, metricName: T) {
  let acc;
  for (let field in entry) {
    if (groupingFields.some((f) => field.startsWith(f))) {
      acc = metrics_summaries.acc_value_of_metric(metricName, acc, entry[field]);
    }
  }
  if (acc && typeof acc == 'object') {
    acc['nUsers'] = entry['nUsers'] || 1;
  }
  return (acc || {}) as MetricValue<T extends `${infer U}` ? U : never>;
}

export const sumMetricEntries = <T extends MetricName>(days: DayOfMetricData[], metricName: T) =>
  sumMetricEntry<T>(aggMetricEntries(days, metricName) as any, metricName);

// Unlabelled data shows up as 'UNKNOWN' grey and mostly transparent
// All other modes are colored according to their base mode
export function getColorForModeLabel(label: string) {
  if (label.startsWith(i18next.t('metrics.footprint.unlabeled'))) {
    const unknownModeColor = base_modes.get_base_mode_by_key('UNKNOWN').color;
    return color(unknownModeColor).alpha(UNCERTAIN_OPACITY).rgb().string();
  }
  return base_modes.get_rich_mode_for_value(textToLabelKey(label), labelOptions).color;
}
