import { GroupingField, MetricName } from '../types/appConfigTypes';

// distance, duration, and count use number values in meters, seconds, and count respectively
// response_count uses object values containing responded and not_responded counts
type MetricValue = number | { responded?: number; not_responded?: number };
export type DayOfMetricData = {
  date: string; // yyyy-mm-dd
  nUsers: number;
} & {
  // each key is a value for a specific grouping field
  // and the value is the respective metric value
  // e.g. { mode_confirm_bikeshare: 123, survey_TripConfirmSurvey: { responded: 4, not_responded: 5 }
  [k in `${GroupingField}_${string}`]: MetricValue;
};

export type MetricsData = {
  [key in MetricName]: DayOfMetricData[];
};
