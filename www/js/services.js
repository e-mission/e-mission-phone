'use strict';

import angular from 'angular';
import { getRawEntries } from './commHelper';

angular.module('emission.services', ['emission.plugin.logger'])

.service('ReferHelper', function($http) {

    this.habiticaRegister = function(groupid, successCallback, errorCallback) {
        window.cordova.plugins.BEMServerComm.getUserPersonalData("/join.group/"+groupid, successCallback, errorCallback);
    };
    this.joinGroup = function(groupid, userid) {

    // TODO:
    return new Promise(function(resolve, reject) {
        window.cordova.plugins.BEMServerComm.postUserPersonalData("/join.group/"+groupid, "inviter", userid, resolve, reject);
      })

    //function firstUpperCase(string) {
    //  return string[0].toUpperCase() + string.slice(1);
    //}*/
    }
})
.service('UnifiedDataLoader', function($window, Logger) {
    var combineWithDedup = function(list1, list2) {
      var combinedList = list1.concat(list2);
      return combinedList.filter(function(value, i, array) {
        var firstIndexOfValue = array.findIndex(function(element, index, array) {
          return element.metadata.write_ts == value.metadata.write_ts;
        });
        return firstIndexOfValue == i;
      });
    };

    // TODO: generalize to iterable of promises
    var combinedPromise = function(localPromise, remotePromise, combiner) {
        return new Promise(function(resolve, reject) {
          var localResult = [];
          var localError = null;

          var remoteResult = [];
          var remoteError = null;

          var localPromiseDone = false;
          var remotePromiseDone = false;

          var checkAndResolve = function() {
            if (localPromiseDone && remotePromiseDone) {
              // time to return from this promise
              if (localError && remoteError) {
                reject([localError, remoteError]);
              } else {
                Logger.log("About to dedup localResult = "+localResult.length
                    +"remoteResult = "+remoteResult.length);
                var dedupedList = combiner(localResult, remoteResult);
                Logger.log("Deduped list = "+dedupedList.length);
                resolve(dedupedList);
              }
            }
          };

          localPromise.then(function(currentLocalResult) {
            localResult = currentLocalResult;
            localPromiseDone = true;
          }, function(error) {
            localResult = [];
            localError = error;
            localPromiseDone = true;
          }).then(checkAndResolve);

          remotePromise.then(function(currentRemoteResult) {
            remoteResult = currentRemoteResult;
            remotePromiseDone = true;
          }, function(error) {
            remoteResult = [];
            remoteError = error;
            remotePromiseDone = true;
          }).then(checkAndResolve);
        })
    }

    // TODO: Generalize this to work for both sensor data and messages
    // Do we even need to separate the two kinds of data?
    // Alternatively, we can maintain another mapping between key -> type
    // Probably in www/json...
    this.getUnifiedSensorDataForInterval = function(key, tq) {
        var localPromise = $window.cordova.plugins.BEMUserCache.getSensorDataForInterval(key, tq, true);
        var remotePromise = getRawEntries([key], tq.startTs, tq.endTs)
          .then(function(serverResponse) {
            return serverResponse.phone_data;
          });
        return combinedPromise(localPromise, remotePromise, combineWithDedup);
    };

    this.getUnifiedMessagesForInterval = function(key, tq, withMetadata) {
      var localPromise = $window.cordova.plugins.BEMUserCache.getMessagesForInterval(key, tq, true);
      var remotePromise = getRawEntries([key], tq.startTs, tq.endTs)
          .then(function(serverResponse) {
            return serverResponse.phone_data;
          });
      return combinedPromise(localPromise, remotePromise, combineWithDedup);
    }
})
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

})

.factory('Chats', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var chats = [{
    id: 0,
    name: 'Ben Sparrow',
    lastText: 'You on your way?',
    face: 'img/ben.png'
  }, {
    id: 1,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me',
    face: 'img/max.png'
  }, {
    id: 2,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat',
    face: 'img/adam.jpg'
  }, {
    id: 3,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks!',
    face: 'img/perry.png'
  }, {
    id: 4,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream.',
    face: 'img/mike.png'
  }, {
    id: 5,
    name: 'Ben Sparrow',
    lastText: 'You on your way again?',
    face: 'img/ben.png'
  }, {
    id: 6,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me again',
    face: 'img/max.png'
  }, {
    id: 7,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat again',
    face: 'img/adam.jpg'
  }, {
    id: 8,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks again!',
    face: 'img/perry.png'
  }, {
    id: 9,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream again.',
    face: 'img/mike.png'
  }];

  return {
    all: function() {
      return chats;
    },
    remove: function(chat) {
      chats.splice(chats.indexOf(chat), 1);
    },
    get: function(chatId) {
      for (var i = 0; i < chats.length; i++) {
        if (chats[i].id === parseInt(chatId)) {
          return chats[i];
        }
      }
      return null;
    }
  };
});
