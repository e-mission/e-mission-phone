export type ServerResponse<Type> = {
  phone_data: Array<ServerData<Type>>;
};

export type ServerData<Type> = {
  data: Type;
  metadata: MetaData;
  key?: string;
  user_id?: { $uuid: string };
  _id?: { $oid: string };
};

export type MetaData = {
  key: string;
  platform: string;
  write_ts: number;
  time_zone: string;
  write_fmt_time: string;
  write_local_dt: LocalDt;
  origin_key?: string;
  read_ts?: number;
};

export type LocalDt = {
  minute: number;
  hour: number;
  second: number;
  day: number;
  weekday: number;
  month: number;
  year: number;
  timezone: string;
};

/*
 * The server also supports queries via TimeQueryComponents, which can be split into multiple
 * dates. The TimeQuery type was designed for UserCache calls, which only query via the
 * `write_ts` time.  For more details,  please see the following files in /e-mission-server/:
 *   - /emission/storage/timeseries/tcquery.py : additional timeQueryComponent
 *   - /emission/storage/timeseries/timeQuery.py : timeQuery object used for `write_ts` queries
 *   - /emission/net/api/cfc_webapp.py : implementation of `/datastreams/find_enteries/<time_type>`
 */
export type TimeQuery = {
  key: string;
  startTs: number;
  endTs: number;
};
