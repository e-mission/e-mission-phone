import {
  calculatePercentChange,
  formatDate,
  formatDateRangeOfDays,
  getLabelsForDay,
  getUniqueLabelsForDays,
  segmentDaysByWeeks,
} from '../js/metrics/metricsHelper';
import { DayOfMetricData } from '../js/metrics/metricsTypes';

describe('metricsHelper', () => {
  describe('getUniqueLabelsForDays', () => {
    const days1 = [
      { mode_confirm_a: 1, mode_confirm_b: 2 },
      { mode_confirm_b: 1, mode_confirm_c: 3 },
      { mode_confirm_c: 1, mode_confirm_d: 3 },
    ] as any as DayOfMetricData[];
    it("should return unique labels for days with 'mode_confirm_*'", () => {
      expect(getUniqueLabelsForDays(days1)).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('getLabelsForDay', () => {
    const day1 = { mode_confirm_a: 1, mode_confirm_b: 2 } as any as DayOfMetricData;
    it("should return labels for a day with 'mode_confirm_*'", () => {
      expect(getLabelsForDay(day1)).toEqual(['a', 'b']);
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
    ] as any as DayOfMetricData[];

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
  });

  describe('formatDate', () => {
    const day1 = { date: '2021-01-01' } as any as DayOfMetricData;
    it('should format date', () => {
      expect(formatDate(day1)).toEqual('1/1');
    });
  });

  describe('formatDateRangeOfDays', () => {
    const days1 = [
      { date: '2021-01-01' },
      { date: '2021-01-02' },
      { date: '2021-01-04' },
    ] as any as DayOfMetricData[];
    it('should format date range for days with date', () => {
      expect(formatDateRangeOfDays(days1)).toEqual('1/1 - 1/4');
    });
  });
});
