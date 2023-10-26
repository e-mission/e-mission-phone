'use strict';

import angular from 'angular';
import { getRawEntries } from './commHelper';

angular.module('emission.services', ['emission.plugin.logger'])
.service('ControlHelper', function($window,
                                   $ionicPopup,
                                   Logger) {

    this.writeFile = function(fileEntry, resultList) {
      // Create a FileWriter object for our FileEntry (log.txt).
    }

    this.getMyData = function(startTs) {
        var fmt = "YYYY-MM-DD";
        // We are only retrieving data for a single day to avoid
        // running out of memory on the phone
        var startMoment = moment(startTs);
        var endMoment = moment(startTs).endOf("day");
        var dumpFile = startMoment.format(fmt) + "."
          + endMoment.format(fmt)
          + ".timeline";
          alert("Going to retrieve data to "+dumpFile);

          var writeDumpFile = function(result) {
            return new Promise(function(resolve, reject) {
              var resultList = result.phone_data;
              window.requestFileSystem(window.LocalFileSystem.TEMPORARY, 0, function(fs) {
                console.log('file system open: ' + fs.name);
                fs.root.getFile(dumpFile, { create: true, exclusive: false }, function (fileEntry) {
                  console.log("fileEntry "+fileEntry.nativeURL+" is file?" + fileEntry.isFile.toString());
                  fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function() {
                      console.log("Successful file write...");
                      resolve();
                      // readFile(fileEntry);
                    };

                    fileWriter.onerror = function (e) {
                      console.log("Failed file write: " + e.toString());
                      reject();
                    };

                    // If data object is not passed in,
                    // create a new Blob instead.
                    var dataObj = new Blob([JSON.stringify(resultList, null, 2)],
                    { type: 'application/json' });
                    fileWriter.write(dataObj);
                  });
                  // this.writeFile(fileEntry, resultList);
                });
              });
            });
          }


          var emailData = function(result) {
            return new Promise(function(resolve, reject) {
              window.requestFileSystem(window.LocalFileSystem.TEMPORARY, 0, function(fs) {
                console.log("During email, file system open: "+fs.name);
                fs.root.getFile(dumpFile, null, function(fileEntry) {
                  console.log("fileEntry "+fileEntry.nativeURL+" is file?"+fileEntry.isFile.toString());
                  fileEntry.file(function (file) {
                    var reader = new FileReader();

                    reader.onloadend = function() {
                      console.log("Successful file read with " + this.result.length +" characters");
                      var dataArray = JSON.parse(this.result);
                      console.log("Successfully read resultList of size "+dataArray.length);
                      // displayFileData(fileEntry.fullPath + ": " + this.result);
                      var attachFile = fileEntry.nativeURL;
                      if (ionic.Platform.isAndroid()) {
                        // At least on nexus, getting a temporary file puts it into
                        // the cache, so I can hardcode that for now
                        attachFile = "app://cache/"+dumpFile;
                      }
                      if (ionic.Platform.isIOS()) {
                        alert(i18next.t('email-service.email-account-mail-app'));
                      }
                      var email = {
                        attachments: [
                          attachFile
                        ],
                        subject: i18next.t('email-service.email-data.subject-data-dump-from-to', {start: startMoment.format(fmt),end: endMoment.format(fmt)}),
                        body: i18next.t('email-service.email-data.body-data-consists-of-list-of-entries')
                      }
                      $window.cordova.plugins.email.open(email).then(resolve());
                    }
                    reader.readAsText(file);
                  }, function(error) {
                    $ionicPopup.alert({title: "Error while downloading JSON dump",
                      template: error});
                    reject(error);
                  });
                });
              });
            });
          };

        getRawEntries(null, startMoment.unix(), endMoment.unix())
          .then(writeDumpFile)
          .then(emailData)
          .then(function() {
             Logger.log("Email queued successfully");
          })
          .catch(function(error) {
             Logger.displayError("Error emailing JSON dump", error);
          })
    };

    this.getOPCode = function() {
      return window.cordova.plugins.OPCodeAuth.getOPCode();
    };

    this.getSettings = function() {
      return window.cordova.plugins.BEMConnectionSettings.getSettings();
    };

});