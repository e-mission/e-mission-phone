import { DateTime } from 'luxon';

import { getRawEntries } from './commHelper';
import { logInfo, displayError, logDebug, logWarn } from '../plugin/logger';
import { FsWindow } from '../types/fileShareTypes';
import { ServerResponse } from '../types/serverData';
import i18next from '../i18nextInit';

declare let window: FsWindow;

export function getMyDataHelpers(fileName: string, startTimeString: string, endTimeString: string) {
  function localWriteFile(result: ServerResponse<any>) {
    const resultList = result.phone_data;
    return new Promise<void>((resolve, reject) => {
      window['resolveLocalFileSystemURL'](window['cordova'].file.cacheDirectory, (fs) => {
        fs.filesystem.root.getFile(fileName, { create: true, exclusive: false }, (fileEntry) => {
          logDebug(`fileEntry ${fileEntry.nativeURL} is file? ${fileEntry.isFile.toString()}`);
          fileEntry.createWriter((fileWriter) => {
            fileWriter.onwriteend = () => {
              logDebug('Successful file write...');
              resolve();
            };
            fileWriter.onerror = (e) => {
              logDebug(`Failed file write: ${e.toString()}`);
              reject();
            };
            logDebug(`fileWriter is: ${JSON.stringify(fileWriter.onwriteend, null, 2)}`);
            // if data object is not passed in, create a new blob instead.
            const dataObj = new Blob([JSON.stringify(resultList, null, 2)], {
              type: 'application/json',
            });
            fileWriter.write(dataObj);
          });
        });
      });
    });
  }

  function localShareData() {
    return new Promise<void>((resolve, reject) => {
      window['resolveLocalFileSystemURL'](window['cordova'].file.cacheDirectory, (fs) => {
        fs.filesystem.root.getFile(
          fileName,
          null,
          (fileEntry) => {
            logDebug(`fileEntry ${fileEntry.nativeURL} is file? ${fileEntry.isFile.toString()}`);
            const shareObj = {
              files: [fileEntry.nativeURL],
              message: i18next.t(
                'shareFile-service.send-data.body-data-consists-of-list-of-entries',
              ),
              subject: i18next.t('shareFile-service.send-data.subject-data-dump-from-to', {
                start: startTimeString,
                end: endTimeString,
              }),
            };
            window['plugins'].socialsharing.shareWithOptions(
              shareObj,
              (result) => {
                logDebug(`Share Completed? ${result.completed}`); // On Android, most likely returns false
                logDebug(`Shared to app:  ${result.app}`);
                resolve();
              },
              (error) => {
                displayError(error, `Sharing failed with message`);
              },
            );
          },
          (error) => {
            displayError(error, 'Error while downloading JSON dump');
            reject(error);
          },
        );
      });
    });
  }

  // window['cordova'].file.cacheDirectory is not guaranteed to free up memory,
  // so it's good practice to remove the file right after it's used!
  function localClearData() {
    return new Promise<void>((resolve, reject) => {
      window['resolveLocalFileSystemURL'](window['cordova'].file.cacheDirectory, (fs) => {
        fs.filesystem.root.getFile(fileName, null, (fileEntry) => {
          fileEntry.remove(
            () => {
              logDebug(`Successfully cleaned up file ${fileName}`);
              resolve();
            },
            (err) => {
              logWarn(`Error deleting ${fileName} : ${err}`);
              reject(err);
            },
          );
        });
      });
    });
  }

  return {
    writeFile: localWriteFile,
    shareData: localShareData,
    clearData: localClearData,
  };
}

/**
 * getMyData fetches timeline data for a given day, and then gives the user a prompt to share the data
 * @param timeStamp initial timestamp of the timeline to be fetched.
 */
export async function getMyData(timeStamp: Date) {
  // We are only retrieving data for a single day to avoid
  // running out of memory on the phone
  const endTime = DateTime.fromJSDate(timeStamp);
  const startTime = endTime.startOf('day');
  const startTimeString = startTime.toFormat("yyyy'-'MM'-'dd");
  const endTimeString = endTime.toFormat("yyyy'-'MM'-'dd");

  // let's rename this to .txt so that we can email it on iPhones
  const dumpFile = startTimeString + '.' + endTimeString + '.timeline.txt';
  alert(`Going to retrieve data to ${dumpFile}`);

  const getDataMethods = getMyDataHelpers(dumpFile, startTimeString, endTimeString);

  getRawEntries(null, startTime.toUnixInteger(), endTime.toUnixInteger())
    .then(getDataMethods.writeFile)
    .then(getDataMethods.shareData)
    .then(getDataMethods.clearData)
    .then(() => {
      logInfo('Share queued successfully');
    })
    .catch((error) => {
      displayError(error, 'Error sharing JSON dump');
    });
}

export const fetchOPCode = () => window['cordova'].plugins.OPCodeAuth.getOPCode();
export const getSettings = () => window['cordova'].plugins.BEMConnectionSettings.getSettings();
