export interface fsWindow extends Window {
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
