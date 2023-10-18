import { DateTime } from "luxon";

import { getRawEntries } from "./commHelper";
import { logInfo, displayError, logDebug } from "./plugin/logger";
import { FsWindow, RawDataCluster } from "./types/fileShareTypes"
import i18next from "./i18nextInit" ;

declare let window: FsWindow;

/**
 * createWriteFile is a factory method for the JSON dump file creation
 * @param fileName is the name of the file to be created
 * @returns a function that returns a promise, which writes the file upon evaluation.
 */
export const createWriteFile = function (fileName: string) {
  return function(result: RawDataCluster) {
    const resultList = result.phone_data;
      return new Promise<void>(function(resolve, reject) {
        window.requestFileSystem(window.LocalFileSystem.TEMPORARY, 0, function(fs) {
          logDebug(`file system open: ${fs.name}`);
          fs.root.getFile(fileName, { create: true, exclusive: false }, function (fileEntry) {
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

              // if data object is not passed in, create a new blog instead.
              const dataObj = new Blob([JSON.stringify(resultList, null, 2)],
                { type: "application/json" });
              fileWriter.write(dataObj);
            })
          });
        });
    });
}};

/**
 * createShareData returns a shareData method, with the input parameters captured.
 * @param fileName is the existing file to be sent
 * @param startTimeString timestamp used to identify the file
 * @param endTimeString " "
 * @returns a function which returns a promise, which shares an existing file upon evaluation.
 */
export const createShareData = function(fileName: string, startTimeString: string, endTimeString: string) {
  return function() {
    return new Promise<void>(function(resolve, reject) {
    window.requestFileSystem(window.LocalFileSystem.TEMPORARY, 0, function(fs) {
      logDebug("During email, file system open: " + fs.name);
      fs.root.getFile(fileName, null, function(fileEntry) {
        logDebug(`fileEntry ${fileEntry.nativeURL} is file? ${fileEntry.isFile.toString()}`);
        fileEntry.file(function(file) {
          const reader = new FileReader();

          reader.onloadend = function() {
            const readResult = this.result as string;
            logDebug(`Successfull file read with ${readResult.length} characters`);
            const dataArray = JSON.parse(readResult);
            logDebug(`Successfully read resultList of size ${dataArray.length}`);
            let attachFile = fileEntry.nativeURL;
              if (window['device'].platform === "android")
                attachFile = "app://cache/" + fileName;
              if (window['device'].platform === "ios")
                alert(i18next.t("email-service.email-account-mail-app"));
              const email = {
                'files': [attachFile],
                'message': i18next.t("email-service.email-data.body-data-consists-of-list-of-entries"),
                'subject': i18next.t("email-service.email-data.subject-data-dump-from-to", {start: startTimeString ,end: endTimeString}),
              }
              window['plugins'].socialsharing.shareWithOptions(email, function (result) {
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
        })                        
      });
    });
    });
}};

/**
 * getMyData fetches timeline data for a given day, and then gives the user a prompt to share the data
 * @param startTs initial timestamp of the timeline to be fetched.
 */
export const getMyData = function(startTs: Date) {
    // We are only retrieving data for a single day to avoid
    // running out of memory on the phone
    const startTime = DateTime.fromJSDate(startTs);
    const endTime = startTime.endOf("day");
    const startTimeString = startTime.toFormat("yyyy'-'MM'-'dd");
    const endTimeString = endTime.toFormat("yyyy'-'MM'-'dd");

    const dumpFile = startTimeString + "."
      + endTimeString
      + ".timeline";
      alert(`Going to retrieve data to ${dumpFile}`);

    // Simulate old conversion to get correct UnixInteger for endMoment data
    const getUnixNum = (dateData: DateTime) => {
      const tempDate = dateData.toFormat("dd MMM yyyy");
      return DateTime.fromFormat(tempDate, "dd MMM yyyy").toUnixInteger();
    };

    const writeDumpFile = createWriteFile(dumpFile);
    const shareData = createShareData(dumpFile, startTimeString, endTimeString);

    getRawEntries(null, getUnixNum(startTime), startTime.toUnixInteger())
      .then(writeDumpFile)
      .then(shareData)
      .then(function() {
          logInfo("Email queued successfully");
      })
      .catch(function(error) {
          displayError(error, "Error emailing JSON dump");
      })
};

export const fetchOPCode = (() => {
      return window["cordova"].plugins.OPCodeAuth.getOPCode();
    });

export const getSettings = (() => {
      return window["cordova"].plugins.BEMConnectionSettings.getSettings();
});
