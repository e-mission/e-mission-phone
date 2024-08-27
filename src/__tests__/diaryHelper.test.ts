import {
  getDetectedModes,
  getFormattedSectionProperties,
  primarySectionForTrip,
  getLocalTimeString,
} from '../js/diary/diaryHelper';

import { base_modes } from 'e-mission-common';

import initializedI18next from '../js/i18nextInit';
import { getImperialConfig } from '../js/config/useImperialConfig';
import { LocalDt } from '../js/types/serverData';
window['i18next'] = initializedI18next;

describe('diaryHelper', () => {
  /* fake trips with 'distance' in their section summaries
    ('count' and 'duration' are not used bygetDetectedModes) */
  let myFakeTrip = {
    distance: 6729.0444371031606,
    cleaned_section_summary: {
      // count: {...}
      // duration: {...}
      distance: {
        BICYCLING: 6013.73657416706,
        WALKING: 715.3078629361006,
      },
    },
  } as any;

  let myFakeTrip2 = {
    ...myFakeTrip,
    inferred_section_summary: {
      // count: {...}
      // duration: {...}
      distance: {
        BICYCLING: 6729.0444371031606,
      },
    },
  };

  let myFakeDetectedModes = [
    { mode: 'BICYCLING', icon: 'bike', color: base_modes.mode_colors['green'], pct: 89 },
    { mode: 'WALKING', icon: 'walk', color: base_modes.mode_colors['blue'], pct: 11 },
  ];

  let myFakeDetectedModes2 = [
    { mode: 'BICYCLING', icon: 'bike', color: base_modes.mode_colors['green'], pct: 100 },
  ];

  describe('getDetectedModes', () => {
    it('returns the detected modes, with percentages, for a trip', () => {
      expect(getDetectedModes(myFakeTrip)).toEqual(myFakeDetectedModes);
      expect(getDetectedModes(myFakeTrip2)).toEqual(myFakeDetectedModes2);
      expect(getDetectedModes({} as any)).toEqual([]); // empty trip, no sections, no modes
    });
  });

  const myFakeTripWithSections = {
    sections: [
      {
        start_fmt_time: '2024-09-18T08:30:00',
        start_local_dt: { year: 2024, month: 9, day: 18, hour: 8, minute: 30, second: 0 },
        end_fmt_time: '2024-09-18T08:45:00',
        end_local_dt: { year: 2024, month: 9, day: 18, hour: 8, minute: 45, second: 0 },
        distance: 1000,
        sensed_mode_str: 'WALKING',
      },
      {
        start_fmt_time: '2024-09-18T08:45:00',
        start_local_dt: { year: 2024, month: 9, day: 18, hour: 8, minute: 45, second: 0 },
        end_fmt_time: '2024-09-18T09:00:00',
        end_local_dt: { year: 2024, month: 9, day: 18, hour: 9, minute: 0, second: 0 },
        distance: 2000,
        sensed_mode_str: 'BICYCLING',
      },
    ],
  } as any;

  const imperialConfg = getImperialConfig(true);

  describe('getFormattedSectionProperties', () => {
    it('returns the formatted section properties for a trip', () => {
      expect(getFormattedSectionProperties(myFakeTripWithSections, imperialConfg)).toEqual([
        {
          startTime: '8:30 AM',
          duration: '15 minutes',
          distance: '0.62',
          distanceSuffix: 'mi',
          icon: 'walk',
          color: base_modes.mode_colors['blue'],
        },
        {
          startTime: '8:45 AM',
          duration: '15 minutes',
          distance: '1.24',
          distanceSuffix: 'mi',
          icon: 'bike',
          color: base_modes.mode_colors['green'],
        },
      ]);
    });
  });

  describe('primarySectionForTrip', () => {
    it('returns the section with the greatest distance for a trip', () => {
      expect(primarySectionForTrip(myFakeTripWithSections)).toEqual(
        myFakeTripWithSections.sections[1],
      );
    });
  });

  describe('getLocalTimeString', () => {
    it('returns the formatted time string for a full LocalDt object', () => {
      expect(
        getLocalTimeString({
          year: 2024,
          month: 9,
          day: 18,
          hour: 15,
          minute: 30,
          second: 8,
          weekday: 3,
          timezone: 'America/Los_Angeles',
        }),
      ).toEqual('3:30 PM');
    });

    it('returns the formatted time string for a LocalDt object with only hour and minute', () => {
      expect(getLocalTimeString({ hour: 8, minute: 30 } as LocalDt)).toEqual('8:30 AM');
    });

    it('returns undefined for an undefined LocalDt object', () => {
      expect(getLocalTimeString()).toBeUndefined();
    });
  });
});
