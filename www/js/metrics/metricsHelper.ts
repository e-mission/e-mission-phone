import { DateTime } from 'luxon';
import color from 'color';
import { DayOfMetricData, MetricEntry, MetricValue } from './metricsTypes';
import { logDebug } from '../plugin/logger';
import { MetricName, groupingFields } from '../types/appConfigTypes';
import { ImperialConfig } from '../config/useImperialConfig';
import i18next from 'i18next';
import { base_modes, metrics_summaries } from 'e-mission-common';
import { formatForDisplay, formatIsoNoYear, isoDatesDifference, isoDateWithOffset } from '../util';
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

/* formatting data form carbon footprint calculations */

//modes considered on foot for carbon calculation, expandable as needed
export const ON_FOOT_MODES = ['WALKING', 'RUNNING', 'ON_FOOT'] as const;

/*
 * metric2val is a function that takes a metric entry and a field and returns
 * the appropriate value.
 * for regular data (user-specific), this will return the field value
 * for avg data (aggregate), this will return the field value/nUsers
 */
export const metricToValue = (population: 'user' | 'aggregate', metric, field) =>
  population == 'user' ? metric[field] : metric[field] / metric.nUsers;

//testing agains global list of what is "on foot"
//returns true | false
export function isOnFoot(mode: string) {
  for (let ped_mode of ON_FOOT_MODES) {
    if (mode === ped_mode) {
      return true;
    }
  }
  return false;
}

//from two weeks fo low and high values, calculates low and high change
export function calculatePercentChange(pastWeekRange, previousWeekRange) {
  let greaterLesserPct = {
    low: (pastWeekRange.low / previousWeekRange.low) * 100 - 100,
    high: (pastWeekRange.high / previousWeekRange.high) * 100 - 100,
  };
  return greaterLesserPct;
}

export function parseDataFromMetrics(metrics, population) {
  logDebug(`parseDataFromMetrics: metrics = ${JSON.stringify(metrics)}; 
    population = ${population}`);
  let mode_bins: { [k: string]: [number, number, string][] } = {};
  metrics?.forEach((metric) => {
    let onFootVal = 0;

    for (let field in metric) {
      /*For modes inferred from sensor data, we check if the string is all upper case 
      by converting it to upper case and seeing if it is changed*/
      if (field == field.toUpperCase()) {
        /*sum all possible on foot modes: see https://github.com/e-mission/e-mission-docs/issues/422 */
        if (isOnFoot(field)) {
          onFootVal += metricToValue(population, metric, field);
          field = 'ON_FOOT';
        }
        if (!(field in mode_bins)) {
          mode_bins[field] = [];
        }
        //for all except onFoot, add to bin - could discover mult onFoot modes
        if (field != 'ON_FOOT') {
          mode_bins[field].push([
            metric.ts,
            metricToValue(population, metric, field),
            metric.fmt_time,
          ]);
        }
      }
      const trimmedField = trimGroupingPrefix(field);
      if (trimmedField) {
        logDebug('Mapped field ' + field + ' to mode ' + trimmedField);
        if (!(trimmedField in mode_bins)) {
          mode_bins[trimmedField] = [];
        }
        mode_bins[trimmedField].push([
          metric.ts,
          Math.round(metricToValue(population, metric, field)),
          DateTime.fromISO(metric.fmt_time).toISO() as string,
        ]);
      }
    }
    //handle the ON_FOOT modes once all have been summed
    if ('ON_FOOT' in mode_bins) {
      mode_bins['ON_FOOT'].push([metric.ts, Math.round(onFootVal), metric.fmt_time]);
    }
  });

  return Object.entries(mode_bins).map(([key, values]) => ({ key, values }));
}

const _datesTsCache = {};
export const tsForDayOfMetricData = (day: DayOfMetricData) => {
  if (_datesTsCache[day.date] == undefined)
    _datesTsCache[day.date] = DateTime.fromISO(day.date).toSeconds();
  return _datesTsCache[day.date];
};

export const valueForFieldOnDay = (day: MetricEntry, field: string, key: string) =>
  day[`${field}_${key}`];

export type MetricsSummary = { key: string; values: number };
export function generateSummaryFromData(modeMap, metric) {
  logDebug(`Invoked getSummaryDataRaw on ${JSON.stringify(modeMap)} with ${metric}`);

  let summaryMap: MetricsSummary[] = [];

  for (let i = 0; i < modeMap.length; i++) {
    let vals = 0;
    for (let j = 0; j < modeMap[i].values.length; j++) {
      vals += modeMap[i].values[j][1]; //2nd item of array is value
    }
    if (metric === 'mean_speed') {
      // For speed, we take the avg. For other metrics we keep the sum
      vals = vals / modeMap[i].values.length;
    }
    summaryMap.push({
      key: modeMap[i].key,
      values: Math.round(vals),
    });
  }

  return summaryMap;
}

/*
 * We use the results to determine whether these results are from custom
 * labels or from the automatically sensed labels. Automatically sensedV
 * labels are in all caps, custom labels are prefixed by label, but have had
 * the label_prefix stripped out before this. Results should have either all
 * sensed labels or all custom labels.
 */
export function isCustomLabels(modeMap) {
  const isSensed = (mode) => mode == mode.toUpperCase();
  const isCustom = (mode) => mode == mode.toLowerCase();
  const metricSummaryChecksCustom: boolean[] = [];
  const metricSummaryChecksSensed: boolean[] = [];

  const distanceKeys = modeMap.map((e) => e.key);
  const isSensedKeys = distanceKeys.map(isSensed);
  const isCustomKeys = distanceKeys.map(isCustom);
  logDebug(`Checking metric keys ${distanceKeys}; sensed ${isSensedKeys}; custom ${isCustomKeys}`);
  const isAllCustomForMetric = isAllCustom(isSensedKeys, isCustomKeys);
  metricSummaryChecksSensed.push(!isAllCustomForMetric);
  metricSummaryChecksCustom.push(Boolean(isAllCustomForMetric));
  logDebug(`overall custom/not results for each metric 
    is ${JSON.stringify(metricSummaryChecksCustom)}`);
  return isAllCustom(metricSummaryChecksSensed, metricSummaryChecksCustom);
}

export function isAllCustom(isSensedKeys, isCustomKeys) {
  const allSensed = isSensedKeys.reduce((a, b) => a && b, true);
  const anySensed = isSensedKeys.reduce((a, b) => a || b, false);
  const allCustom = isCustomKeys.reduce((a, b) => a && b, true);
  const anyCustom = isCustomKeys.reduce((a, b) => a || b, false);
  if (allSensed && !anyCustom) {
    return false; // sensed, not custom
  }
  if (!anySensed && allCustom) {
    return true; // custom, not sensed; false implies that the other option is true
  }
  // Logger.displayError("Mixed entries that combine sensed and custom labels",
  //     "Please report to your program admin");
  return undefined;
}

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
