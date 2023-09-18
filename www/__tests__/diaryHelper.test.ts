import { getFormattedDate } from "../js/diary/diaryHelper";

it('returns a formatted date', () => {
  expect(getFormattedDate("2023-09-18T00:00:00-07:00")).toBe("Mon September 18, 2023");
});
