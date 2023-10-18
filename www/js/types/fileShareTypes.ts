import { LocalDt } from "./diaryTypes"; 

export interface FsWindow extends Window {
  requestFileSystem: (
    type: number,
    size: number,
    successCallback: (fs: any) => void,
    errorCallback?: (error: any) => void
  ) => void;
  LocalFileSystem: {
    TEMPORARY: number;
    PERSISTENT: number;
  };
};

/* These are the objects returned from getRawEnteries when it is called by 
   the getMyData() method. */ 
export interface RawDataCluster {
  phone_data: Array<RawData>
}

export interface RawData {
  data: {
    name: string, 
    ts: number,
    reading: number,
  },
  metadata: {
    key: string,
    platform: string, 
    write_ts: number,
    time_zone: string, 
    write_fmt_time: string,
    write_local_dt: LocalDt,
  },
  user_id: {
    $uuid: string,
  },
  _id: {
    $oid: string,
  }
}

