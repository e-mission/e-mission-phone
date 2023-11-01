import { DateTime } from "luxon";

import { getRawEntries } from "./commHelper";
import { logInfo, displayError, logDebug, logWarn } from "../plugin/logger";
import { FsWindow } from "../types/fileShareTypes"
import { ServerResponse} from "../types/serverData";
import i18next from "../i18nextInit" ;

declare let window: FsWindow;

export const getMyDataHelpers = function(fileName: string, startTimeString: string, endTimeString: string) {
  const localWriteFile = function (result: ServerResponse<any>) {
    const resultList = result.phone_data;
      return new Promise<void>(function(resolve, reject) {
        window['resolveLocalFileSystemURL'](window['cordova'].file.tempDirectory, function(fs) {
          fs.filesystem.root.getFile(fileName, { create: true, exclusive: false }, function (fileEntry) {
            logDebug(`fileEntry ${fileEntry.nativeURL} is file? ${fileEntry.isFile.toString()}`)
            fileEntry.createWriter(function (fileWriter) {
              fileWriter.onwriteend = function() {
                logDebug("Successful file write...");
                resolve();
              }
              fileWriter.onerror = function(e) {
                logDebug(`Failed file write: ${e.toString()}`);
                reject();
              }

              // if data object is not passed in, create a new blob instead.
              const dataObj = new Blob([JSON.stringify(resultList, null, 2)],
                { type: "application/json" });
              fileWriter.write(dataObj);
            })
          });
        });
    });
  };

  const localShareData = function () {
    return new Promise<void>(function(resolve, reject) {
    window['resolveLocalFileSystemURL'](window['cordova'].file.tempDirectory, function(fs) {
      fs.filesystem.root.getFile(fileName, null, function(fileEntry) {
        logDebug(`fileEntry ${fileEntry.nativeURL} is file? ${fileEntry.isFile.toString()}`);
        fileEntry.file(function(file) {
          const reader = new FileReader();

          reader.onloadend = function() {
            const readResult = this.result as string;
            logDebug(`Successfull file read with ${readResult.length} characters`);
            const dataArray = JSON.parse(readResult);
            logDebug(`Successfully read resultList of size ${dataArray.length}`);
            let attachFile = fileEntry.nativeURL;
            const shareObj = {
              'files': [attachFile],
              'message': i18next.t("email-service.email-data.body-data-consists-of-list-of-entries"),
              'subject': i18next.t("email-service.email-data.subject-data-dump-from-to", {start: startTimeString, end: endTimeString}),
            }
            window['plugins'].socialsharing.shareWithOptions(shareObj, function (result) {
              logDebug(`Share Completed? ${result.completed}`); // On Android, most likely returns false
              logDebug(`Shared to app:  ${result.app}`);
              resolve();
            }, function (msg) {
              logDebug(`Sharing failed with message ${msg}`);
            });
          }
          reader.readAsText(file);
        }, function(error) {
          displayError(error, "Error while downloading JSON dump");
          reject(error);
        });
        
      });
    });
  })
  };

  // window['cordova'].file.TempDirectory is not guaranteed to free up memory,
  // so it's good practice to remove the file right after it's used!
  const localClearData = function() {
    return new Promise<void>(function(resolve, reject) {
      window['resolveLocalFileSystemURL'](window['cordova'].file.tempDirectory, function(fs) {
        fs.filesystem.root.getFile(fileName, null, function(fileEntry) {
          fileEntry.remove(() => {
            logDebug(`Successfully cleaned up file ${fileName}`);
            resolve();
          },
          (err) => {
            logWarn(`Error deleting ${fileName} : ${err}`);
            reject(err);
          });
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
export const getMyData = function(timeStamp: Date) {
    // We are only retrieving data for a single day to avoid
    // running out of memory on the phone
    const endTime = DateTime.fromJSDate(timeStamp);
    const startTime = endTime.startOf('day');
    const startTimeString = startTime.toFormat("yyyy'-'MM'-'dd");
    const endTimeString = endTime.toFormat("yyyy'-'MM'-'dd");

    const dumpFile = startTimeString + "."
      + endTimeString
      + ".timeline";
      alert(`Going to retrieve data to ${dumpFile}`);

    const getDataMethods = getMyDataHelpers(dumpFile, startTimeString, endTimeString);

    getRawEntries(null, startTime.toUnixInteger(), endTime.toUnixInteger())
      .then(getDataMethods.writeFile)
      .then(getDataMethods.shareData)
      .then(getDataMethods.clearData)
      .then(function() {
          logInfo("Share queued successfully");
      })
      .catch(function(error) {
          displayError(error, "Error sharing JSON dump");
      })
};

export const fetchOPCode = (() => {
      return window["cordova"].plugins.OPCodeAuth.getOPCode();
    });

export const getSettings = (() => {
      return window["cordova"].plugins.BEMConnectionSettings.getSettings();
});
