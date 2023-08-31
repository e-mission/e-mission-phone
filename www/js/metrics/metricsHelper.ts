import { DateTime } from "luxon";
import { formatForDisplay } from "../config/useImperialConfig";
import { DayOfMetricData } from "./metricsTypes";

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
