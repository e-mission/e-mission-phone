export interface ServerData {
    data: any,
    metadata: MetaData,
    key?: string,
    user_id?: { $uuid: string, },
    _id?: { $oid: string, },
};

export type MetaData = {
    key: string,
    platform: string, 
    write_ts: number,
    time_zone: string, 
    write_fmt_time: string,
    write_local_dt: LocalDt,
};
  
export type LocalDt = {
    minute: number,
    hour: number,
    second: number,
    day: number,
    weekday: number,
    month: number,
    year: number,
    timezone: string,
};
  