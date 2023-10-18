/* This draft of diaryTypes was added to PR 1052, so that the LocalDT type is 
   consistent across PRs.  Only LocalDt is needed for the controlHelper rewrite */
export type LocalDt = {
  minute: number,
  hour: number,
  second: number,
  day: number,
  weekday: number,
  month: number,
  year: number,
  timezone: string,
}
