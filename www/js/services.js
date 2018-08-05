'use strict';

angular.module('emission.services', ['emission.plugin.logger'])

.service('CommHelper', function($http) {
    var getConnectURL = function(successCallback, errorCallback) {
        window.cordova.plugins.BEMConnectionSettings.getSettings(
            function(settings) {
                successCallback(settings.connectUrl);
            }, errorCallback);
    };

    this.registerUser = function(successCallback, errorCallback) {
            window.cordova.plugins.BEMServerComm.getUserPersonalData("/profile/create", successCallback, errorCallback);
    };

    this.updateUser = function(updateDoc) {
        return new Promise(function(resolve, reject) {
            window.cordova.plugins.BEMServerComm.postUserPersonalData("/profile/update", "update_doc", updateDoc, resolve, reject);
        });
    };

    this.getUser = function() {
        return new Promise(function(resolve, reject) {
            window.cordova.plugins.BEMServerComm.getUserPersonalData("/profile/get", resolve, reject);
        });
    };

    this.getTimelineForDay = function(date) {
        return new Promise(function(resolve, reject) {
          var dateString = date.startOf('day').format('YYYY-MM-DD');
          window.cordova.plugins.BEMServerComm.getUserPersonalData("/timeline/getTrips/"+dateString, resolve, reject);
        });
    };

    /*
     * var regConfig = {'username': ....}
     * Other fields can be added easily and the server can be modified at the same time.
     */
    this.habiticaRegister = function(regConfig) {
        return new Promise(function(resolve, reject){
          window.cordova.plugins.BEMServerComm.postUserPersonalData("/habiticaRegister", "regConfig", regConfig, resolve, reject);
      });
    };

    /*
     * Example usage:
     * Get profile:
     * callOpts = {'method': 'GET', 'method_url': "/api/v3/user",
                    'method_args': null}
     * Go to sleep:
     * callOpts = {'method': 'POST', 'method_url': "/api/v3/user/sleep",
                   'method_args': {'data': True}}
     * Stop sleeping:
     * callOpts = {'method': 'POST', 'method_url': "/api/v3/user/sleep",
                   'method_args': {'data': False}}
     * Get challenges for a user:
     * callOpts = {'method': 'GET', 'method_url': "/api/v3/challenges/user",
                    'method_args': null}
     * ....
     */

    this.habiticaProxy = function(callOpts){
      return new Promise(function(resolve, reject){
        window.cordova.plugins.BEMServerComm.postUserPersonalData("/habiticaProxy", "callOpts", callOpts, resolve, reject);
      });
    };

    this.getMetrics = function(timeType, metrics_query) {
      return new Promise(function(resolve, reject) {
        var msgFiller = function(message) {
            for (var key in metrics_query) {
                message[key] = metrics_query[key]
            };
        };
        window.cordova.plugins.BEMServerComm.pushGetJSON("/result/metrics/"+timeType, msgFiller, resolve, reject);
      })
    };

    this.getIncidents = function(start_ts, end_ts) {
      return new Promise(function(resolve, reject) {
        var msgFiller = function(message) {
           message.start_time = start_ts;
           message.end_time = end_ts;
           message.sel_region = null;
           console.log("About to return message "+JSON.stringify(message));
        };
        console.log("About to call pushGetJSON for the timestamp");
        window.cordova.plugins.BEMServerComm.pushGetJSON("/result/heatmap/incidents/timestamp", msgFiller, resolve, reject);
      })
    };

    /*
     * key_list = list of keys to retrieve or None for all keys
     * start_time = beginning timestamp for range
     * end_time = ending timestamp for rangeA
     */
    this.moment2Localdate = function(momentObj) {
       return {
         year: momentObj.year(),
         month: momentObj.month() + 1,
         day: momentObj.date(),
       };
    };

    this.moment2Timestamp = function(momentObj) {
      return momentObj.unix();
    }

    this.getRawEntriesForLocalDate = function(key_list, start_ts, end_ts) {
      return new Promise(function(resolve, reject) {
          var msgFiller = function(message) {
            message.key_list = key_list;
            message.from_local_date = moment2Localdate(moment.unix(start_ts));
            message.to_local_date = moment2Localdate(moment.unix(end_ts));
            console.log("About to return message "+JSON.stringify(message));
          };
          console.log("getRawEntries: about to get pushGetJSON for the timestamp");
          window.cordova.plugins.BEMServerComm.pushGetJSON("/datastreams/find_entries/local_date", msgFiller, resolve, reject);
      });
    };

    this.getRawEntries = function(key_list, start_ts, end_ts) {
      return new Promise(function(resolve, reject) {
          var msgFiller = function(message) {
            message.key_list = key_list;
            message.start_time = start_ts;
            message.end_time = end_ts;
            console.log("About to return message "+JSON.stringify(message));
          };
          console.log("getRawEntries: about to get pushGetJSON for the timestamp");
          window.cordova.plugins.BEMServerComm.pushGetJSON("/datastreams/find_entries/timestamp", msgFiller, resolve, reject);
      });
    };

    this.getPipelineCompleteTs = function() {
      return new Promise(function(resolve, reject) {
          console.log("getting pipeline complete timestamp");
          window.cordova.plugins.BEMServerComm.getUserPersonalData("/pipeline/get_complete_ts", resolve, reject);
      });
    };
})

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
.service('UnifiedDataLoader', function($window, CommHelper, Logger) {
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
        var remotePromise = CommHelper.getRawEntries([key], tq.startTs, tq.endTs)
          .then(function(serverResponse) {
            return serverResponse.phone_data;
          });
        return combinedPromise(localPromise, remotePromise, combineWithDedup);
    };

    this.getUnifiedMessagesForInterval = function(key, tq, withMetadata) {
      var localPromise = $window.cordova.plugins.BEMUserCache.getMessagesForInterval(key, tq, true);
      var remotePromise = CommHelper.getRawEntries([key], tq.startTs, tq.endTs)
          .then(function(serverResponse) {
            return serverResponse.phone_data;
          });
      return combinedPromise(localPromise, remotePromise, combineWithDedup);
    }
})
.service('ControlHelper', function($cordovaEmailComposer,
                                   $ionicPopup,
                                   CommHelper) {
  this.emailLog = function() {
        var parentDir = "unknown";

         $cordovaEmailComposer.isAvailable().then(function() {
           // is available
         }, function () {
            alert("Email account is not configured, cannot send email");
            return;
         });

        if (ionic.Platform.isAndroid()) {
            parentDir = "app://databases";
        }
        if (ionic.Platform.isIOS()) {
            alert("You must have the mail app on your phone configured with an email address. Otherwise, this won't work");
            parentDir = cordova.file.dataDirectory+"../LocalDatabase";
        }

        if (parentDir == "unknown") {
          alert("parentDir unexpectedly = "+parentDir+"!")
        }

        /*
        window.Logger.log(window.Logger.LEVEL_INFO,
            "Going to export logs to "+parentDir);
         */
        alert("Going to email database from "+parentDir+"/loggerDB");

        var email = {
            to: ['shankari@eecs.berkeley.edu'],
            attachments: [
                parentDir+"/loggerDB"
            ],
            subject: 'emission logs',
            body: 'please fill in what went wrong'
        }

        $cordovaEmailComposer.open(email).then(function() {
           window.Logger.log(window.Logger.LEVEL_DEBUG,
               "Email queued successfully");
        },
        function () {
           // user cancelled email. in this case too, we want to remove the file
           // so that the file creation earlier does not fail.
           window.Logger.log(window.Logger.LEVEL_INFO,
               "Email cancel reported, seems to be an error on android");
        });
    };

    var error = function(error){
      console.log(error);
    };

    this.exportUserCacheDB = function() {
      var parentDir = "unknown";

      if (ionic.Platform.isAndroid()) {
        parentDir = cordova.file.dataDirectory+"../databases";
      }
      if (parentDir == "unknown") {
        alert("Cannot export user cache from this device.");
      } else {
        var userCache = parentDir+ "/userCacheDB";
        alert("About to copy userCache from "+parentDir+"/userCacheDB");
        window.resolveLocalFileSystemURL(userCache, function(fileEntry) {
          console.log(userCache);
          var copyTo = cordova.file.externalDataDirectory;
          window.resolveLocalFileSystemURL(copyTo, function(dirEntry){
            console.log(copyTo);
            fileEntry.copyTo(dirEntry, "userCacheDB",
              function(success){
                console.log("Copied userCacheDB");
              },
              function(error){
                console.log(error);
              });
          },  function(error){
                console.log(error);
              });
        },  function(error){
              console.log(error);
            });
      }
    };

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
              window.cordova.plugins.BEMJWTAuth.getUserEmail().then(function(userEmail) {
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
                          alert("You must have the mail app on your phone configured with an email address. Otherwise, this won't work");
                        }
                        var email = {
                          to: [userEmail],
                          attachments: [
                            attachFile
                          ],
                          subject: 'Data dump from '+startMoment.format(fmt)
                          + " to " + endMoment.format(fmt),
                          body: 'Data consists of a list of entries.\n'
                          + 'Entry formats are at https://github.com/e-mission/e-mission-server/tree/master/emission/core/wrapper \n'
                          + 'Data can be loaded locally using instructions at https://github.com/e-mission/e-mission-server#loading-test-data \n'
                          + ' and can be manipulated using the example at https://github.com/e-mission/e-mission-server/blob/master/Timeseries_Sample.ipynb'
                        }
                        $cordovaEmailComposer.open(email).then(resolve());
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
            });
          };

        CommHelper.getRawEntries(null, startMoment.unix(), endMoment.unix())
          .then(writeDumpFile)
          .then(emailData)
          .then(function() {
             window.Logger.log(window.Logger.LEVEL_DEBUG,
                 "Email queued successfully");
          })
          .catch(function(error) {
             window.Logger.log(window.Logger.LEVEL_INFO,
                 "Email cancel reported, seems to be an error on android");
            $ionicPopup.alert({'title': "Error sending email",
                'template': JSON.stringify(error)});
          })
    };

    this.getUserEmail = function() {
      return window.cordova.plugins.BEMJWTAuth.getUserEmail();
    };

    this.getSettings = function() {
      return window.cordova.plugins.BEMConnectionSettings.getSettings();
    };

})

// common configuration methods across all screens
// e.g. maps
// for consistent L&F

.factory('Config', function() {
    var config = {};

    config.getMapTiles = function() {
      return {
          tileLayer: 'http://tile.stamen.com/terrain/{z}/{x}/{y}.png',
          tileLayerOptions: {
              attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
              opacity: 0.9,
              detectRetina: true,
              reuseTiles: true,
          }
      };
    };
    return config;
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
