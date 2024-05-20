import { LocalDt } from '../types/serverData';
import { MetricName } from '../types/appConfigTypes';

type LabelProps = { [k in `label_${string}`]?: number }; // label_<mode>, where <mode> could be anything
export type DayOfServerMetricData = LabelProps & {
  ts: number;
  fmt_time: string;
  nUsers: number;
  local_dt: LocalDt;
};

type ModeProps = { [k in `mode_${string}`]?: number }; // mode_<mode>, where <mode> could be anything
export type DayOfClientMetricData = ModeProps & {
  date: string; // yyyy-mm-dd
};

export type DayOfMetricData = DayOfClientMetricData | DayOfServerMetricData;

export type MetricsData = {
  [key in MetricName]: DayOfMetricData[];
};
