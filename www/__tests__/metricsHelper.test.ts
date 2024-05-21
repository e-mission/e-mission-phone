import {
  calculatePercentChange,
  formatDate,
  formatDateRangeOfDays,
  getLabelsForDay,
  getUniqueLabelsForDays,
  segmentDaysByWeeks,
} from '../js/metrics/metricsHelper';
import {
  DayOfClientMetricData,
  DayOfMetricData,
  DayOfServerMetricData,
} from '../js/metrics/metricsTypes';

describe('metricsHelper', () => {
  describe('getUniqueLabelsForDays', () => {
    const days1 = [
      { label_a: 1, label_b: 2 },
      { label_c: 1, label_d: 3 },
    ] as any as DayOfServerMetricData[];
    it("should return unique labels for days with 'label_*'", () => {
      expect(getUniqueLabelsForDays(days1)).toEqual(['a', 'b', 'c', 'd']);
    });

    const days2 = [
      { mode_a: 1, mode_b: 2 },
      { mode_c: 1, mode_d: 3 },
    ] as any as DayOfClientMetricData[];
    it("should return unique labels for days with 'mode_*'", () => {
      expect(getUniqueLabelsForDays(days2)).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('getLabelsForDay', () => {
    const day1 = { label_a: 1, label_b: 2 } as any as DayOfServerMetricData;
    it("should return labels for a day with 'label_*'", () => {
      expect(getLabelsForDay(day1)).toEqual(['a', 'b']);
    });

    const day2 = { mode_a: 1, mode_b: 2 } as any as DayOfClientMetricData;
    it("should return labels for a day with 'mode_*'", () => {
      expect(getLabelsForDay(day2)).toEqual(['a', 'b']);
    });
  });

  // secondsToMinutes

  // secondsToHours

  describe('segmentDaysByWeeks', () => {
    const days1 = [
      { date: '2021-01-01' },
      { date: '2021-01-02' },
      { date: '2021-01-04' },
      { date: '2021-01-08' },
      { date: '2021-01-09' },
      { date: '2021-01-10' },
    ] as any as DayOfClientMetricData[];

    it("should segment days with 'date' into weeks", () => {
      expect(segmentDaysByWeeks(days1, '2021-01-10')).toEqual([
        // most recent week
        [
          { date: '2021-01-04' },
          { date: '2021-01-08' },
          { date: '2021-01-09' },
          { date: '2021-01-10' },
        ],
        // prior week
        [{ date: '2021-01-01' }, { date: '2021-01-02' }],
      ]);
    });

    const days2 = [
      { fmt_time: '2021-01-01T00:00:00Z' },
      { fmt_time: '2021-01-02T00:00:00Z' },
      { fmt_time: '2021-01-04T00:00:00Z' },
      { fmt_time: '2021-01-08T00:00:00Z' },
      { fmt_time: '2021-01-09T00:00:00Z' },
      { fmt_time: '2021-01-10T00:00:00Z' },
    ] as any as DayOfServerMetricData[];
    it("should segment days with 'fmt_time' into weeks", () => {
      expect(segmentDaysByWeeks(days2, '2021-01-10')).toEqual([
        // most recent week
        [
          { fmt_time: '2021-01-04T00:00:00Z' },
          { fmt_time: '2021-01-08T00:00:00Z' },
          { fmt_time: '2021-01-09T00:00:00Z' },
          { fmt_time: '2021-01-10T00:00:00Z' },
        ],
        // prior week
        [{ fmt_time: '2021-01-01T00:00:00Z' }, { fmt_time: '2021-01-02T00:00:00Z' }],
      ]);
    });
  });

  describe('formatDate', () => {
    const day1 = { date: '2021-01-01' } as any as DayOfClientMetricData;
    it('should format date', () => {
      expect(formatDate(day1)).toEqual('1/1');
    });

    const day2 = { fmt_time: '2021-01-01T00:00:00Z' } as any as DayOfServerMetricData;
    it('should format date', () => {
      expect(formatDate(day2)).toEqual('1/1');
    });
  });

  describe('formatDateRangeOfDays', () => {
    const days1 = [
      { date: '2021-01-01' },
      { date: '2021-01-02' },
      { date: '2021-01-04' },
    ] as any as DayOfClientMetricData[];
    it('should format date range for days with date', () => {
      expect(formatDateRangeOfDays(days1)).toEqual('1/1 - 1/4');
    });

    const days2 = [
      { fmt_time: '2021-01-01T00:00:00Z' },
      { fmt_time: '2021-01-02T00:00:00Z' },
      { fmt_time: '2021-01-04T00:00:00Z' },
    ] as any as DayOfServerMetricData[];
    it('should format date range for days with fmt_time', () => {
      expect(formatDateRangeOfDays(days2)).toEqual('1/1 - 1/4');
    });
  });
});
