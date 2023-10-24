import { METRIC_LIST } from "./MetricsTab"

type MetricName = typeof METRIC_LIST[number];
type LabelProps = {[k in `label_${string}`]?: number}; // label_<mode>, where <mode> could be anything
export type DayOfMetricData = LabelProps & {
  ts: number,
  fmt_time: string,
  nUsers: number,
  local_dt: {[k: string]: any}, // TODO type datetime obj
}

export type MetricsData = {
  [key in MetricName]: DayOfMetricData[]
}
