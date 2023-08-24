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
