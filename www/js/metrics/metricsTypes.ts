import { GroupingField, MetricName } from '../types/appConfigTypes';

type TravelMetricName = 'distance' | 'duration' | 'count';

// distance, duration, and count use number values in meters, seconds, and count respectively
// response_count uses object values containing responded and not_responded counts
// footprint uses object values containing kg_co2 and kwh values with optional _uncertain values
export type MetricValue<T extends MetricName> = T extends TravelMetricName
  ? number
  : T extends 'response_count'
    ? { responded?: number; not_responded?: number }
    : T extends 'footprint'
      ? { kg_co2: number; kg_co2_uncertain?: number; kwh: number; kwh_uncertain?: number }
      : never;

export type MetricEntry<T extends MetricName = MetricName> = {
  [k in `${GroupingField}_${string}`]?: MetricValue<T>;
};

export type DayOfMetricData<T extends MetricName = MetricName> = {
  date: string; // yyyy-mm-dd
  nUsers: number;
} & MetricEntry<T>;

export type MetricsData = {
  [key in MetricName]: DayOfMetricData<key>[];
};
