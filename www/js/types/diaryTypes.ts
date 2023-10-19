/* This is a draft of diaryTypes, originally added in PR #1061.  This file appears
  in #1052 as well; these three will most likely be consolidated and rewritten in a 
  future PR */
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

export type MetaData = {
  key: string,
  platform: string, 
  write_ts: number,
  time_zone: string, 
  write_fmt_time: string,
  write_local_dt: LocalDt,
} 

export type ServerDataPoint = {
  data: any,
  metadata: MetaData,
  key?: string,
  user_id?: { $uuid: string, },
  _id?: { $oid: string, },
}

/* These are the objects returned from BEMUserCache calls */ 
export type ServerData = {
  phone_data: Array<ServerDataPoint>
}

export type TimeQuery = {
  key: string;
  startTs: number;
  endTs: number;
}