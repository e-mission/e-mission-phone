import { DateTime } from "luxon";

import { getRawEntries } from "./commHelper";
import { logInfo, displayError } from "./plugin/logger";
import i18next from "./i18nextInit" ;

interface fsWindow extends Window {
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

declare let window: fsWindow;

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

    const writeDumpFile = function(result) {
      const resultList = result.phone_data;
      return new Promise<void>(function(resolve, reject) {
        window.requestFileSystem(window.LocalFileSystem.TEMPORARY, 0, function(fs) {
          console.log(`file system open: ${fs.name}`);
          fs.root.getFile(dumpFile, { create: true, exclusive: false }, function (fileEntry) {
            console.log(`fileEntry ${fileEntry.nativeURL} is file? ${fileEntry.isFile.toString()}`)
            fileEntry.createWriter(function (fileWriter) {
              fileWriter.onwriteend = function() {
                console.log("Successful file write...");
                resolve();
              }
              fileWriter.onerror = function(e) {
                console.log(`Failed file write: ${e.toString()}`);
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
    }

    const emailData = function() {
      return new Promise<void>(function(resolve, reject) {
      window.requestFileSystem(window.LocalFileSystem.TEMPORARY, 0, function(fs) {
        console.log("During email, file system open: " + fs.name);
        fs.root.getFile(dumpFile, null, function(fileEntry) {
          console.log(`fileEntry ${fileEntry.nativeURL} is file? ${fileEntry.isFile.toString()}`);
          fileEntry.file(function(file) {
            const reader = new FileReader();

            reader.onloadend = function() {
              const readResult = this.result as string;
              console.log(`Successfull file read with ${readResult.length} characters`);
              const dataArray = JSON.parse(readResult);
              console.log(`Successfully read resultList of size ${dataArray.length}`);
              var attachFile = fileEntry.nativeURL;
                if (window['device'].platform === "android")
                  attachFile = "app://cache/" + dumpFile;
                if (window['device'].platform === "ios")
                  alert(i18next.t("email-service.email-account-mail-app"));
                const email = {
                  'files': [attachFile],
                  'message': i18next.t("email-service.email-data.body-data-consists-of-list-of-entries"),
                  'subject': i18next.t("email-service.email-data.subject-data-dump-from-to", {start: startTimeString ,end: endTimeString}),
                }
                window['plugins'].socialsharing.shareWithOptions(email, function (result) {
                  console.log(`Share Completed? ${result.completed}`); // On Android, most likely returns false
                  console.log(`Shared to app:  ${result.app}`);
                  resolve();
                }, function (msg) {
                  console.log(`Sharing failed with message ${msg}`);
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
    };

    // Simulate old conversion to get correct UnixInteger for endMoment data
    const getUnixNum = (dateData: DateTime) => {
      const tempDate = dateData.toFormat("dd MMM yyyy");
      return DateTime.fromFormat(tempDate, "dd MMM yyyy").toUnixInteger();
    };

    getRawEntries(null, getUnixNum(startTime), startTime.toUnixInteger())
      .then(writeDumpFile)
      .then(emailData)
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