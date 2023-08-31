import { DateTime } from "luxon";
import { formatForDisplay } from "../config/useImperialConfig";
import { DayOfMetricData } from "./metricsTypes";
import { getAngularService } from "../angular-react-helper";

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
export function filterToRecentWeeks(metricsDays: DayOfMetricData[]) {
  const weeks: DayOfMetricData[][] = [];
  if (metricsDays?.length >= 7)
    weeks.push(metricsDays.slice(-7));
  if (metricsDays?.length >= 14)
    weeks.push(metricsDays.slice(-14, -7));
  return weeks;
}

export function formatDateRangeOfDays(days: DayOfMetricData[]) {
  const firstDayDt = DateTime.fromISO(days[0].fmt_time, { zone: 'utc' });
  const lastDayDt = DateTime.fromISO(days[days.length - 1].fmt_time, { zone: 'utc' });
  const firstDay = firstDayDt.toLocaleString({...DateTime.DATE_SHORT, year: undefined});
  const lastDay = lastDayDt.toLocaleString({...DateTime.DATE_SHORT, year: undefined});
  return `${firstDay} - ${lastDay}`;
}

/* for each mode label present in `days`, sum the cumulative distance and duration to get
  the average speed for that mode */
export function getAvgSpeedsForDays(days: DayOfMetricData[]) {
  const avgSpeeds: { [key: string]: number } = {};
  const sumDistances: { [key: string]: number } = {};
  const sumDurations: { [key: string]: number } = {};
  days.forEach(day => {
    const labels = getLabelsForDay(day);
    labels.forEach(label => {
      sumDistances[label] = (sumDistances[label] || 0) + day[`distance_${label}`];
      sumDurations[label] = (sumDurations[label] || 0) + day[`duration_${label}`];
    });
  });
  Object.keys(sumDistances).forEach(label => {
    avgSpeeds[label] = sumDistances[label] / sumDurations[label];
  });
  return avgSpeeds;
}

function getMETs() {
  if (getAngularService('CalorieCal').useCustom == true) {
    return getAngularService('CustomDatasetHelper').getCustomMETs();
  }
  return getAngularService('METDatasetHelper').getStandardMETs();
}

const MPS_TO_MPH = 2.23694;
export function getMetForModeAndSpeed(mode: string, speed: number, defaultIfMissing = 0) {
  if (mode == 'ON_FOOT') {
    console.log("CalorieCal.getMet() converted 'ON_FOOT' to 'WALKING'");
    mode = 'WALKING';
  }
  let currentMETs = getMETs();
  if (!currentMETs[mode]) {
    console.warn("CalorieCal.getMet() Illegal mode: " + mode);
    return defaultIfMissing; //So the calorie sum does not break with wrong return type
  }
  for (var i in currentMETs[mode]) {
    const speedMph = speed * MPS_TO_MPH;
    if (speedMph > currentMETs[mode][i].range[0] && speedMph < currentMETs[mode][i].range[1]) {
      return currentMETs[mode][i].mets;
    } else if (speedMph < 0 ) {
      console.log("CalorieCal.getMet() Negative speed: " + speedMph);
      return 0;
    }
  }
}
