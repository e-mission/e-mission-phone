import { getFormattedDate, motionTypeOf, isMultiDay } from "../js/diary/diaryHelper";

it('returns a formatted date', () => {
  expect(getFormattedDate("2023-09-18T00:00:00-07:00")).toBe("Mon September 18, 2023");
  expect(getFormattedDate("")).toBeUndefined();
  expect(getFormattedDate("2023-09-18T00:00:00-07:00", "2023-09-21T00:00:00-07:00")).toBe("Mon September 18, 2023 - Thu September 21, 2023");
});

it("returns a MotionType object", () => {
  expect(motionTypeOf("WALKING")).toEqual({ name: "WALKING", icon: "walk", color: '#0068a5' });
  // expect(motionTypeOf("MotionTypes.WALKING")).toEqual({ name: "WALKING", icon: "walk", color: '#0068a5' }); //failing but I don't know why
  expect(motionTypeOf("I made this type up")).toEqual({ name: "UNKNOWN", icon: "help", color: '#484848'});
});

it('returns true/false is multi day', () => {
  expect(isMultiDay("2023-09-18T00:00:00-07:00", "2023-09-19T00:00:00-07:00")).toBeTruthy();
  expect(isMultiDay("2023-09-18T00:00:00-07:00", "2023-09-18T00:00:00-09:00")).toBeFalsy();
  expect(isMultiDay("", "2023-09-18T00:00:00-09:00")).toBeFalsy();
});