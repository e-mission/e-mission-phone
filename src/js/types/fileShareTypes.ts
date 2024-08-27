import { BEMData } from './serverData';

export type TimeStampData = BEMData<RawTimelineData>;

export type RawTimelineData = {
  name: string;
  ts: number;
  reading: number;
};

export interface FsWindow extends Window {
  requestFileSystem: (
    type: number,
    size: number,
    successCallback: (fs: any) => void,
    errorCallback?: (error: any) => void,
  ) => void;
  LocalFileSystem: {
    TEMPORARY: number;
    PERSISTENT: number;
  };
}
