import { DateTime } from 'luxon';
import {
  calculatePercentChange,
  formatDate,
  formatDateRangeOfDays,
  getActiveModes,
  getLabelsForDay,
  trimGroupingPrefix,
  getUniqueLabelsForDays,
  secondsToHours,
  secondsToMinutes,
  segmentDaysByWeeks,
  tsForDayOfMetricData,
  valueForFieldOnDay,
  getUnitUtilsForMetric,
  aggMetricEntries,
  sumMetricEntry,
  sumMetricEntries,
  getColorForModeLabel,
} from '../js/metrics/metricsHelper';
import { DayOfMetricData } from '../js/metrics/metricsTypes';
import initializedI18next from '../js/i18nextInit';
import { LabelOptions } from '../js/types/labelTypes';
import {
  getLabelOptions,
  labelKeyToText,
  labelOptions,
} from '../js/survey/multilabel/confirmHelper';
import { base_modes } from 'e-mission-common';
window['i18next'] = initializedI18next;

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

  describe('trimGroupingPrefix', () => {
    it('should trim the grouping field prefix from a metrics key', () => {
      expect(trimGroupingPrefix('mode_confirm_access_recreation')).toEqual('access_recreation');
      expect(trimGroupingPrefix('primary_ble_sensed_mode_CAR')).toEqual('CAR');
    });

    it('should return "" if the key did not start with a grouping field', () => {
      expect(trimGroupingPrefix('invalid_foo')).toEqual('');
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
      expect(formatDate(day1)).toEqual('Jan 1');
    });
  });

  describe('formatDateRangeOfDays', () => {
    const days1 = [
      { date: '2021-01-01' },
      { date: '2021-01-02' },
      { date: '2021-01-04' },
    ] as any as DayOfMetricData[];
    it('should format date range for days with date', () => {
      expect(formatDateRangeOfDays(days1)).toEqual('Jan 1 – Jan 4'); // note: en dash
    });
  });

  describe('getActiveModes', () => {
    const fakeLabelOptions = {
      MODE: [
        { value: 'walk', base_mode: 'WALKING' },
        { value: 'bike', base_mode: 'BICYCLING' },
        { value: 'ebike', base_mode: 'E_BIKE' },
        { value: 'car', base_mode: 'CAR' },
        { value: 'bus', base_mode: 'BUS' },
        { value: 'myskateboard', met: { ZOOMING: { mets: 5 } } },
      ],
    } as LabelOptions;
    it('should return active modes', () => {
      expect(getActiveModes(fakeLabelOptions)).toEqual(['walk', 'bike', 'ebike', 'myskateboard']);
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

  const fakeFootprintEntries = [
    {
      date: '2024-05-28',
      nUsers: 10,
      mode_confirm_a: { kwh: 1, kg_co2: 2 },
    },
    {
      date: '2024-05-29',
      nUsers: 20,
      mode_confirm_a: { kwh: 5, kg_co2: 8 },
      mode_confirm_b: { kwh: 2, kg_co2: 4, kwh_uncertain: 1, kg_co2_uncertain: 2 },
    },
  ];

  describe('aggMetricEntries', () => {
    it('aggregates footprint metric entries', () => {
      const result = aggMetricEntries(fakeFootprintEntries, 'footprint');
      expect(result).toEqual({
        nUsers: 30,
        mode_confirm_a: expect.objectContaining({
          kwh: 6,
          kg_co2: 10,
        }),
        mode_confirm_b: expect.objectContaining({
          kwh: 2,
          kg_co2: 4,
          kwh_uncertain: 1,
          kg_co2_uncertain: 2,
        }),
      });
    });
  });

  describe('sumMetricEntry', () => {
    it('sums a single footprint metric entry', () => {
      expect(sumMetricEntry(fakeFootprintEntries[0], 'footprint')).toEqual(
        expect.objectContaining({
          nUsers: 10,
          kwh: 1,
          kg_co2: 2,
        }),
      );
    });
  });

  describe('sumMetricEntries', () => {
    it('aggregates and sums footprint metric entries', () => {
      expect(sumMetricEntries(fakeFootprintEntries, 'footprint')).toEqual(
        expect.objectContaining({
          nUsers: 30,
          kwh: 8,
          kg_co2: 14,
          kwh_uncertain: 1,
          kg_co2_uncertain: 2,
        }),
      );
    });
  });

  describe('getColorForModeLabel', () => {
    // initialize label options (blank appconfig so the default label options will be used)
    getLabelOptions({});
    // access the text for each mode option to initialize the color map
    labelOptions.MODE.forEach((mode) => labelKeyToText(mode.value));

    it('returns semi-transparent grey if the label starts with "Unlabeled"', () => {
      expect(getColorForModeLabel('Unlabeledzzzzz')).toBe('rgba(85, 85, 85, 0.12)');
    });

    it('returns color for modes that exist in the label options', () => {
      expect(getColorForModeLabel('walk')).toBe(base_modes.BASE_MODES['WALKING'].color);
      expect(getColorForModeLabel('bike')).toBe(base_modes.BASE_MODES['BICYCLING'].color);
      expect(getColorForModeLabel('e-bike')).toBe(base_modes.BASE_MODES['E_BIKE'].color);
      expect(getColorForModeLabel('bus')).toBe(base_modes.BASE_MODES['BUS'].color);
    });
  });
});
