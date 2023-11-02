import {
  getFormattedDate,
  isMultiDay,
  getFormattedDateAbbr,
  getFormattedTimeRange,
  getDetectedModes,
  getBaseModeByKey,
  modeColors,
} from '../js/diary/diaryHelper';

it('returns a formatted date', () => {
  expect(getFormattedDate('2023-09-18T00:00:00-07:00')).toBe('Mon September 18, 2023');
  expect(getFormattedDate('')).toBeUndefined();
  expect(getFormattedDate('2023-09-18T00:00:00-07:00', '2023-09-21T00:00:00-07:00')).toBe(
    'Mon September 18, 2023 - Thu September 21, 2023',
  );
});

it('returns an abbreviated formatted date', () => {
  expect(getFormattedDateAbbr('2023-09-18T00:00:00-07:00')).toBe('Mon, Sep 18');
  expect(getFormattedDateAbbr('')).toBeUndefined();
  expect(getFormattedDateAbbr('2023-09-18T00:00:00-07:00', '2023-09-21T00:00:00-07:00')).toBe(
    'Mon, Sep 18 - Thu, Sep 21',
  );
});

it('returns a human readable time range', () => {
  expect(getFormattedTimeRange('2023-09-18T00:00:00-07:00', '2023-09-18T00:00:00-09:20')).toBe(
    '2 hours',
  );
  expect(getFormattedTimeRange('2023-09-18T00:00:00-07:00', '2023-09-18T00:00:00-09:30')).toBe(
    '3 hours',
  );
  expect(getFormattedTimeRange('', '2023-09-18T00:00:00-09:30')).toBeFalsy();
});

it('returns a Base Mode for a given key', () => {
  expect(getBaseModeByKey('WALKING')).toEqual({
    name: 'WALKING',
    icon: 'walk',
    color: modeColors.blue,
  });
  expect(getBaseModeByKey('MotionTypes.WALKING')).toEqual({
    name: 'WALKING',
    icon: 'walk',
    color: modeColors.blue,
  });
  expect(getBaseModeByKey('I made this type up')).toEqual({
    name: 'UNKNOWN',
    icon: 'help',
    color: modeColors.grey,
  });
});

it('returns true/false is multi day', () => {
  expect(isMultiDay('2023-09-18T00:00:00-07:00', '2023-09-19T00:00:00-07:00')).toBeTruthy();
  expect(isMultiDay('2023-09-18T00:00:00-07:00', '2023-09-18T00:00:00-09:00')).toBeFalsy();
  expect(isMultiDay('', '2023-09-18T00:00:00-09:00')).toBeFalsy();
});

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
  { mode: 'BICYCLING', icon: 'bike', color: modeColors.green, pct: 89 },
  { mode: 'WALKING', icon: 'walk', color: modeColors.blue, pct: 11 },
];

let myFakeDetectedModes2 = [{ mode: 'BICYCLING', icon: 'bike', color: modeColors.green, pct: 100 }];

it('returns the detected modes, with percentages, for a trip', () => {
  expect(getDetectedModes(myFakeTrip)).toEqual(myFakeDetectedModes);
  expect(getDetectedModes(myFakeTrip2)).toEqual(myFakeDetectedModes2);
  expect(getDetectedModes({} as any)).toEqual([]); // empty trip, no sections, no modes
})
