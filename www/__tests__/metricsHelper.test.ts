import { DateTime } from 'luxon';
import {
  calculatePercentChange,
  formatDate,
  formatDateRangeOfDays,
  getLabelsForDay,
  getUniqueLabelsForDays,
  secondsToHours,
  secondsToMinutes,
  segmentDaysByWeeks,
  metricToValue,
  tsForDayOfMetricData,
  valueForFieldOnDay,
  generateSummaryFromData,
  isCustomLabels,
  isAllCustom,
  isOnFoot,
  getUnitUtilsForMetric,
} from '../js/metrics/metricsHelper';
import { DayOfMetricData } from '../js/metrics/metricsTypes';
import initializedI18next from '../js/i18nextInit';
window['i18next'] = initializedI18next;

describe('metricsHelper', () => {
  describe('getUniqueLabelsForDays', () => {
    it("should return unique labels for days with 'mode_confirm_*'", () => {
      const days1 = [
        { mode_confirm_a: 1, mode_confirm_b: 2 },
        { mode_confirm_b: 1, mode_confirm_c: 3 },
        { mode_confirm_c: 1, mode_confirm_d: 3 },
      ] as any as DayOfMetricData[];
      expect(getUniqueLabelsForDays(days1)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should return unique labels for days with duplicated labels', () => {
      const days2 = [
        { mode_confirm_a: 1, mode_confirm_b: 2 },
        { mode_confirm_a: 1, mode_confirm_b: 2 },
        { mode_confirm_a: 1, mode_confirm_b: 2 },
      ] as any as DayOfMetricData[];
      expect(getUniqueLabelsForDays(days2)).toEqual(['a', 'b']);
    });
  });

  describe('getLabelsForDay', () => {
    const day1 = { mode_confirm_a: 1, mode_confirm_b: 2 } as any as DayOfMetricData;
    it("should return labels for a day with 'mode_confirm_*'", () => {
      expect(getLabelsForDay(day1)).toEqual(['a', 'b']);
    });
  });

  describe('secondsToMinutes', () => {
    it('should convert from seconds to minutes properly', () => {
      expect(secondsToMinutes(360)).toEqual(6);
    });
  });

  describe('secondsToHours', () => {
    it('should convert from seconds to hours properly', () => {
      expect(secondsToHours(3600)).toEqual(1);
    });
  });

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

  describe('metricToValue', () => {
    const metric = {
      walking: 10,
      nUsers: 5,
    };
    it('returns correct value for user population', () => {
      const result = metricToValue('user', metric, 'walking');
      expect(result).toBe(10);
    });

    it('returns correct value for aggregate population', () => {
      const result = metricToValue('aggregate', metric, 'walking');
      expect(result).toBe(2);
    });
  });

  describe('isOnFoot', () => {
    it('returns true for on foot mode', () => {
      const result = isOnFoot('WALKING');
      expect(result).toBe(true);
    });

    it('returns false for non on foot mode', () => {
      const result = isOnFoot('DRIVING');
      expect(result).toBe(false);
    });
  });

  describe('calculatePercentChange', () => {
    it('calculates percent change correctly for low and high values', () => {
      const pastWeekRange = { low: 10, high: 30 };
      const previousWeekRange = { low: 5, high: 10 };
      const result = calculatePercentChange(pastWeekRange, previousWeekRange);
      expect(result.low).toBe(100);
      expect(result.high).toBe(200);
    });
  });

  describe('tsForDayOfMetricData', () => {
    const mockDay = {
      date: '2024-05-28T12:00:00Z',
      nUsers: 10,
    };
    let _datesTsCache;
    beforeEach(() => {
      _datesTsCache = {};
    });

    it('calculates timestamp for a given day', () => {
      const expectedTimestamp = DateTime.fromISO(mockDay.date).toSeconds();
      const result = tsForDayOfMetricData(mockDay);
      expect(result).toBe(expectedTimestamp);
    });

    it('caches the timestamp for subsequent calls with the same day', () => {
      const firstResult = tsForDayOfMetricData(mockDay);
      const secondResult = tsForDayOfMetricData(mockDay);
      expect(secondResult).toBe(firstResult);
    });
  });

  describe('valueForFieldOnDay', () => {
    const mockDay = {
      date: '2024-05-28T12:00:00Z',
      nUsers: 10,
      field_key: 'example_value',
    };

    it('returns the value for a specified field and key', () => {
      const result = valueForFieldOnDay(mockDay, 'field', 'key');
      expect(result).toBe('example_value');
    });
  });

  describe('generateSummaryFromData', () => {
    const modeMap = [
      {
        key: 'mode1',
        values: [
          ['value1', 10],
          ['value2', 20],
        ],
      },
      {
        key: 'mode2',
        values: [
          ['value3', 30],
          ['value4', 40],
        ],
      },
    ];
    it('returns summary with sum for non-speed metric', () => {
      const metric = 'some_metric';
      const expectedResult = [
        { key: 'mode1', values: 30 },
        { key: 'mode2', values: 70 },
      ];
      const result = generateSummaryFromData(modeMap, metric);
      expect(result).toEqual(expectedResult);
    });

    it('returns summary with average for speed metric', () => {
      const metric = 'mean_speed';
      const expectedResult = [
        { key: 'mode1', values: 15 },
        { key: 'mode2', values: 35 },
      ];
      const result = generateSummaryFromData(modeMap, metric);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('isCustomLabels', () => {
    it('returns true for all custom labels', () => {
      const modeMap = [
        {
          key: 'label_mode1',
          values: [
            ['value1', 10],
            ['value2', 20],
          ],
        },
        {
          key: 'label_mode2',
          values: [
            ['value3', 30],
            ['value4', 40],
          ],
        },
      ];
      const result = isCustomLabels(modeMap);
      expect(result).toBe(true);
    });

    it('returns true for all sensed labels', () => {
      const modeMap = [
        {
          key: 'label_mode1',
          values: [
            ['value1', 10],
            ['value2', 20],
          ],
        },
        {
          key: 'label_mode2',
          values: [
            ['value3', 30],
            ['value4', 40],
          ],
        },
      ];
      const result = isCustomLabels(modeMap);
      expect(result).toBe(true);
    });

    it('returns false for mixed custom and sensed labels', () => {
      const modeMap = [
        {
          key: 'label_mode1',
          values: [
            ['value1', 10],
            ['value2', 20],
          ],
        },
        {
          key: 'MODE2',
          values: [
            ['value3', 30],
            ['value4', 40],
          ],
        },
      ];
      const result = isCustomLabels(modeMap);
      expect(result).toBe(false);
    });
  });

  describe('isAllCustom', () => {
    it('returns true when all keys are custom', () => {
      const isSensedKeys = [false, false, false];
      const isCustomKeys = [true, true, true];
      const result = isAllCustom(isSensedKeys, isCustomKeys);
      expect(result).toBe(true);
    });

    it('returns false when all keys are sensed', () => {
      const isSensedKeys = [true, true, true];
      const isCustomKeys = [false, false, false];
      const result = isAllCustom(isSensedKeys, isCustomKeys);
      expect(result).toBe(false);
    });

    it('returns undefined for mixed custom and sensed keys', () => {
      const isSensedKeys = [true, false, true];
      const isCustomKeys = [false, true, false];
      const result = isAllCustom(isSensedKeys, isCustomKeys);
      expect(result).toBe(undefined);
    });
  });

  describe('getUnitUtilsForMetric', () => {
    const imperialConfig = {
      distanceSuffix: 'mi',
      speedSuffix: 'mph',
      convertDistance: jest.fn((d) => d),
      convertSpeed: jest.fn((s) => s),
      getFormattedDistance: jest.fn((d) => `${d} mi`),
      getFormattedSpeed: jest.fn((s) => `${s} mph`),
    };

    it('checks for distance metric', () => {
      const result = getUnitUtilsForMetric('distance', imperialConfig);
      expect(result).toEqual(['mi', expect.any(Function), expect.any(Function)]);
      expect(result[1](1)).toBe(1);
      expect(result[2](1)).toBe('1 mi mi');
    });

    it('checks for duration metric', () => {
      const result = getUnitUtilsForMetric('duration', imperialConfig);
      expect(result).toEqual(['hours', expect.any(Function), expect.any(Function)]);
      expect(result[1](3600)).toBe(1);
      expect(result[2](3600)).toBe('1 hours');
    });

    it('checks for count metric', () => {
      const result = getUnitUtilsForMetric('count', imperialConfig);
      expect(result).toEqual(['trips', expect.any(Function), expect.any(Function)]);
      const mockTrip = { responded: 4, not_responded: 3 };
      expect(result[1](mockTrip)).toBe(mockTrip);
      expect(result[2](mockTrip)).toBe(mockTrip + ' trips');
    });

    it('checks for response_count metric', () => {
      const result = getUnitUtilsForMetric('response_count', imperialConfig);
      expect(result).toEqual(['responses', expect.any(Function), expect.any(Function)]);
      const mockResponse = { responded: 5, not_responded: 2 };
      expect(result[1](mockResponse)).toBe(5);
      expect(result[2](mockResponse)).toBe('5/7 responses');
    });
  });
});
