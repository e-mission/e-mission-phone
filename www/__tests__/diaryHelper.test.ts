import { getFormattedSectionProperties, getFormattedDate, motionTypeOf, isMultiDay, getFormattedDateAbbr, getFormattedTimeRange, getPercentages } from "../js/diary/diaryHelper";
import { useImperialConfig } from "../js/config/useImperialConfig";

it('returns a formatted date', () => {
  expect(getFormattedDate("2023-09-18T00:00:00-07:00")).toBe("Mon September 18, 2023");
  expect(getFormattedDate("")).toBeUndefined();
  expect(getFormattedDate("2023-09-18T00:00:00-07:00", "2023-09-21T00:00:00-07:00")).toBe("Mon September 18, 2023 - Thu September 21, 2023");
});

it('returns an abbreviated formatted date', () => {
  expect(getFormattedDateAbbr("2023-09-18T00:00:00-07:00")).toBe("Mon, Sep 18");
  expect(getFormattedDateAbbr("")).toBeUndefined();
  expect(getFormattedDateAbbr("2023-09-18T00:00:00-07:00", "2023-09-21T00:00:00-07:00")).toBe("Mon, Sep 18 - Thu, Sep 21");
});

it('returns a human readable time range', () => {
  expect(getFormattedTimeRange("2023-09-18T00:00:00-07:00", "2023-09-18T00:00:00-09:20")).toBe("2 hours");
  expect(getFormattedTimeRange("2023-09-18T00:00:00-07:00", "2023-09-18T00:00:00-09:30")).toBe("3 hours");
  expect(getFormattedTimeRange("", "2023-09-18T00:00:00-09:30")).toBeFalsy();
});

it("returns a MotionType object", () => {
  expect(motionTypeOf("WALKING")).toEqual({ name: "WALKING", icon: "walk", color: '#0068a5' });
  expect(motionTypeOf("MotionTypes.WALKING")).toEqual({ name: "WALKING", icon: "walk", color: '#0068a5' });
  expect(motionTypeOf("I made this type up")).toEqual({ name: "UNKNOWN", icon: "help", color: '#484848'});
});

it('returns true/false is multi day', () => {
  expect(isMultiDay("2023-09-18T00:00:00-07:00", "2023-09-19T00:00:00-07:00")).toBeTruthy();
  expect(isMultiDay("2023-09-18T00:00:00-07:00", "2023-09-18T00:00:00-09:00")).toBeFalsy();
  expect(isMultiDay("", "2023-09-18T00:00:00-09:00")).toBeFalsy();
});

//created a fake trip with relevant sections by examining log statements
let myFakeTrip = {sections: [
  { "sensed_mode_str": "BICYCLING", "distance": 6013.73657416706 },
  { "sensed_mode_str": "WALKING", "distance": 715.3078629361006 }
]};
let myFakeTrip2 = {sections: [
  { "sensed_mode_str": "BICYCLING", "distance": 6013.73657416706 },
  { "sensed_mode_str": "BICYCLING", "distance": 715.3078629361006 }
]};

let myFakePcts = [
  { mode: "BICYCLING",
    icon: "bike",
    color: '#007e46',
    pct: 89 },
  { mode: "WALKING",
    icon: "walk",
    color: '#0068a5',
    pct: 11 }];

let myFakePcts2 = [
  { mode: "BICYCLING",
    icon: "bike",
    color: '#007e46',
    pct: 100 }];

it('returns the percetnages by mode for a trip', () => {
  expect(getPercentages(myFakeTrip)).toEqual(myFakePcts);
  expect(getPercentages(myFakeTrip2)).toEqual(myFakePcts2);
  expect(getPercentages({})).toEqual({});
})

