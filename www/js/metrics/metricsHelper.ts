import { DateTime } from "luxon";
import { formatForDisplay } from "../config/useImperialConfig";
import { DayOfMetricData } from "./metricsTypes";
import moment from 'moment';

export function getUniqueLabelsForDays(metricDataDays: DayOfMetricData[]) {
  const uniqueLabels: string[] = [];
  metricDataDays.forEach(e => {
    Object.keys(e).forEach(k => {
      if (k.startsWith('label_')) {
        const label = k.substring(6); // remove 'label_' prefix leaving just the mode label
        if (!uniqueLabels.includes(label)) uniqueLabels.push(label);
      }
    });
  });
  return uniqueLabels;
}

export const getLabelsForDay = (metricDataDay: DayOfMetricData) => (
  Object.keys(metricDataDay).reduce((acc, k) => {
    if (k.startsWith('label_')) {
      acc.push(k.substring(6)); // remove 'label_' prefix leaving just the mode label
    }
    return acc;
  }, [] as string[])
);

export const secondsToMinutes = (seconds: number) =>
  formatForDisplay(seconds / 60);

export const secondsToHours = (seconds: number) =>
  formatForDisplay(seconds / 3600);

// segments metricsDays into weeks, with the most recent week first
export function segmentDaysByWeeks (days: DayOfMetricData[], nWeeks?: number) {
  const weeks: DayOfMetricData[][] = [];
  for (let i = days?.length - 1; i >= 0; i -= 7) {
    weeks.push(days.slice(Math.max(i - 6, 0), i + 1));
  }
  if (nWeeks) return weeks.slice(0, nWeeks);
  return weeks;
};

export function formatDate(day: DayOfMetricData) {
  const dt = DateTime.fromISO(day.fmt_time, { zone: 'utc' });
  return dt.toLocaleString({...DateTime.DATE_SHORT, year: undefined});
}

export function formatDateRangeOfDays(days: DayOfMetricData[]) {
  if (!days?.length) return '';
  const firstDayDt = DateTime.fromISO(days[0].fmt_time, { zone: 'utc' });
  const lastDayDt = DateTime.fromISO(days[days.length - 1].fmt_time, { zone: 'utc' });
  const firstDay = firstDayDt.toLocaleString({...DateTime.DATE_SHORT, year: undefined});
  const lastDay = lastDayDt.toLocaleString({...DateTime.DATE_SHORT, year: undefined});
  return `${firstDay} - ${lastDay}`;
}

/* formatting data form carbon footprint calculations */

//modes considered on foot for carbon calculation, expandable as needed
const ON_FOOT_MODES = ['WALKING', 'RUNNING', 'ON_FOOT'] as const;

/*
* metric2val is a function that takes a metric entry and a field and returns
* the appropriate value.
* for regular data (user-specific), this will return the field value
* for avg data (aggregate), this will return the field value/nUsers
*/
const metricToValue = function(population:'user'|'aggreagte', metric, field) {
  if(population == "user"){
    return metric[field];
  }
  else{
    return metric[field]/metric.nUsers;
  }
}

//testing agains global list of what is "on foot"
//returns true | false
const isOnFoot = function(mode: string) {
  for (let ped_mode in ON_FOOT_MODES) {
    if (mode === ped_mode) {
      return true;
    }
  }
  return false;
}

//from two weeks fo low and high values, calculates low and high change
export function calculatePercentChange(pastWeekRange, previousWeekRange) {
  let greaterLesserPct = {
    low: (pastWeekRange.low/previousWeekRange.low) * 100 - 100,
    high: (pastWeekRange.high/previousWeekRange.high) * 100 - 100,
  }
  return greaterLesserPct;
}

export function parseDataFromMetrics(metrics, population) {
  console.log("Called parseDataFromMetrics on ", metrics);
  let mode_bins = {};
  metrics?.forEach(function(metric) {
    let onFootVal = 0;

    for (let field in metric) {
      /*For modes inferred from sensor data, we check if the string is all upper case 
      by converting it to upper case and seeing if it is changed*/
      if(field == field.toUpperCase()) {
        /*sum all possible on foot modes: see https://github.com/e-mission/e-mission-docs/issues/422 */
        if (isOnFoot(field)) {
          onFootVal += metricToValue(population, metric, field);
          field = 'ON_FOOT';
        }
        if (!(field in mode_bins)) {
          mode_bins[field] = [];
        }
        //for all except onFoot, add to bin - could discover mult onFoot modes
        if (field != "ON_FOOT") {
          mode_bins[field].push([metric.ts, metricToValue(population, metric, field), metric.fmt_time]);
        }
      }
      //this section handles user lables, assuming 'label_' prefix
      if(field.startsWith('label_')) {
        let actualMode = field.slice(6, field.length); //remove prefix
        console.log("Mapped field "+field+" to mode "+actualMode);
        if (!(actualMode in mode_bins)) {
            mode_bins[actualMode] = [];
        }
        mode_bins[actualMode].push([metric.ts, Math.round(metricToValue(population, metric, field)), moment(metric.fmt_time).format()]);
      }
    }
    //handle the ON_FOOT modes once all have been summed
    if ("ON_FOOT" in mode_bins) {
      mode_bins["ON_FOOT"].push([metric.ts, Math.round(onFootVal), metric.fmt_time]);
    }
  });

  let return_val = [];
  for (let mode in mode_bins) {
      return_val.push({key: mode, values: mode_bins[mode]});
  }

  return return_val;
}

export function generateSummaryFromData(modeMap, metric) {
  console.log("Invoked getSummaryDataRaw on ", modeMap, "with", metric);

  let summaryMap = [];

  for (let i=0; i < modeMap.length; i++){
    let summary = {};
    summary['key'] = modeMap[i].key; 
    let sumVals = 0;

    for (let j = 0; j < modeMap[i].values.length; j++)
    {
      sumVals += modeMap[i].values[j][1]; //2nd item of array is value
    }
    if (metric === 'mean_speed'){ 
      //we care about avg speed, sum for other metrics
      summary['values'] = Math.round(sumVals / modeMap[i].values.length);
    } else {
      summary['values'] = Math.round(sumVals);
    }

    summaryMap.push(summary);
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
export const isCustomLabels = function(modeMap) {
  const isSensed = (mode) => mode == mode.toUpperCase();
  const isCustom = (mode) => mode == mode.toLowerCase();
  const metricSummaryChecksCustom = [];
  const metricSummaryChecksSensed = [];

  const distanceKeys = modeMap.map((e) => e.key);
  const isSensedKeys = distanceKeys.map(isSensed);
  const isCustomKeys = distanceKeys.map(isCustom);
  console.log("Checking metric keys", distanceKeys, " sensed ", isSensedKeys,
      " custom ", isCustomKeys);
  const isAllCustomForMetric = isAllCustom(isSensedKeys, isCustomKeys);
  metricSummaryChecksSensed.push(!isAllCustomForMetric);
  metricSummaryChecksCustom.push(isAllCustomForMetric);

  console.log("overall custom/not results for each metric = ", metricSummaryChecksCustom);
  return isAllCustom(metricSummaryChecksSensed, metricSummaryChecksCustom);
}

const isAllCustom = function(isSensedKeys, isCustomKeys) {
    const allSensed = isSensedKeys.reduce((a, b) => a && b, true);
    const anySensed = isSensedKeys.reduce((a, b) => a || b, false);
    const allCustom = isCustomKeys.reduce((a, b) => a && b, true);
    const anyCustom = isCustomKeys.reduce((a, b) => a || b, false);
    if ((allSensed && !anyCustom)) {
        return false; // sensed, not custom
    }
    if ((!anySensed && allCustom)) {
        return true; // custom, not sensed; false implies that the other option is true
    }
    // Logger.displayError("Mixed entries that combine sensed and custom labels",
    //     "Please report to your program admin");
    return undefined;
}