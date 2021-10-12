'use strict';

angular.module('emission.services', ['emission.plugin.logger',
                                     'emission.plugin.kvstore'])

.service('CommHelper', function($rootScope) {
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

    this.putOne = function(key, data) {
        var now = moment().unix();
        var md = {
            "write_ts": now,
            "read_ts": now,
            "time_zone": moment.tz.guess(),
            "type": "message",
            "key": key,
            "platform": ionic.Platform.platform()
        };
        var entryToPut = {
            "metadata": md,
            "data": data
        }
        return new Promise(function(resolve, reject) {
            window.cordova.plugins.BEMServerComm.postUserPersonalData("/usercache/putone", "the_entry", entryToPut, resolve, reject);
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

    // time_key is typically metadata.write_ts or data.ts
    this.getRawEntriesForLocalDate = function(key_list, start_ts, end_ts,
        time_key = "metadata.write_ts", max_entries = undefined, trunc_method = "sample") {
      return new Promise(function(resolve, reject) {
          var msgFiller = function(message) {
            message.key_list = key_list;
            message.from_local_date = moment2Localdate(moment.unix(start_ts));
            message.to_local_date = moment2Localdate(moment.unix(end_ts));
            message.key_local_date = time_key;
            if (max_entries !== undefined) {
                message.max_entries = max_entries;
                message.trunc_method = trunc_method;
            }
            console.log("About to return message "+JSON.stringify(message));
          };
          console.log("getRawEntries: about to get pushGetJSON for the timestamp");
          window.cordova.plugins.BEMServerComm.pushGetJSON("/datastreams/find_entries/local_date", msgFiller, resolve, reject);
      });
    };

    this.getRawEntries = function(key_list, start_ts, end_ts,
        time_key = "metadata.write_ts", max_entries = undefined, trunc_method = "sample") {
      return new Promise(function(resolve, reject) {
          var msgFiller = function(message) {
            message.key_list = key_list;
            message.start_time = start_ts;
            message.end_time = end_ts;
            message.key_time = time_key;
            if (max_entries !== undefined) {
                message.max_entries = max_entries;
                message.trunc_method = trunc_method;
            }
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

    this.getPipelineRangeTs = function() {
      return new Promise(function(resolve, reject) {
          console.log("getting pipeline range timestamps");
          window.cordova.plugins.BEMServerComm.getUserPersonalData("/pipeline/get_range_ts", resolve, reject);
      });
    };


    // host is automatically read from $rootScope.connectUrl, which is set in app.js
    this.getAggregateData = function(path, data) {
        return new Promise(function(resolve, reject) {
          const full_url = $rootScope.connectUrl+"/"+path;
          data["aggregate"] = true

          if ($rootScope.aggregateAuth === "no_auth") {
              console.log("getting aggregate data without user authentication from "
                + full_url +" with arguments "+JSON.stringify(data));
              const options = {
                  method: 'post',
                  data: data,
                  responseType: 'json'
              }
              cordova.plugin.http.sendRequest(full_url, options,
              function(response) {
                resolve(response.data);
              }, function(error) {
                reject(error);
              });
          } else {
              console.log("getting aggregate data with user authentication from "
                + full_url +" with arguments "+JSON.stringify(data));
              var msgFiller = function(message) {
                return Object.assign(message, data);
              };
              window.cordova.plugins.BEMServerComm.pushGetJSON("/"+path, msgFiller, resolve, reject);
          }
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
.service('ControlHelper', function($window,
                                   $ionicPopup,
                                   $translate,
                                   CommHelper,
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
                          alert($translate.instant('email-service.email-account-mail-app'));
                        }
                        var email = {
                          to: [userEmail],
                          attachments: [
                            attachFile
                          ],
                          subject: $translate.instant('email-service.email-data.subject-data-dump-from-to', {start: startMoment.format(fmt),end: endMoment.format(fmt)}),
                          body: $translate.instant('email-service.email-data.body-data-consists-of-list-of-entries')
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
            });
          };

        CommHelper.getRawEntries(null, startMoment.unix(), endMoment.unix())
          .then(writeDumpFile)
          .then(emailData)
          .then(function() {
             Logger.log("Email queued successfully");
          })
          .catch(function(error) {
             Logger.displayError("Error emailing JSON dump", error);
          })
    };

    this.getUserEmail = function() {
      return window.cordova.plugins.BEMJWTAuth.getUserEmail();
    };

    this.getSettings = function() {
      return window.cordova.plugins.BEMConnectionSettings.getSettings();
    };

})

.service('CarbonDatasetHelper', function(KVStore) {
  var CARBON_DATASET_KEY = 'carbon_dataset_locale';

  // Values are in Kg/PKm (kilograms per passenger-kilometer)
  // Sources for EU values:
  //  - Tremod: 2017, CO2, CH4 and N2O in CO2-equivalent
  //  - HBEFA: 2020, CO2 (per country)
  // German data uses Tremod. Other EU countries (and Switzerland) use HBEFA for car and bus,
  // and Tremod for train and air (because HBEFA doesn't provide these).
  // EU data is an average of the Tremod/HBEFA data for the countries listed;
  // for this average the HBEFA data was used also in the German set (for car and bus).
  var carbonDatasets = {
    US: {
      regionName: "United States",
      footprintData: {
        WALKING:      0,
        BICYCLING:    0,
        CAR:        267/1609,
        BUS:        278/1609,
        LIGHT_RAIL: 120/1609,
        SUBWAY:      74/1609,
        TRAM:        90/1609,
        TRAIN:       92/1609,
        AIR_OR_HSR: 217/1609
      }
    },
    EU: {                   // Plain average of values for the countries below (using HBEFA for car and bus, Tremod for others)
      regionName: "European Union",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.14515,
        BUS:         0.04751,
        LIGHT_RAIL:  0.064,
        SUBWAY:      0.064,
        TRAM:        0.064,
        TRAIN:       0.048,
        AIR_OR_HSR:  0.201
      }
    },
    DE: {
      regionName: "Germany",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.139,   // Tremod (passenger car)
        BUS:         0.0535,  // Tremod (average city/coach)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    },
    FR: {
      regionName: "France",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.13125, // HBEFA (passenger car, considering 1 passenger)
        BUS:         0.04838, // HBEFA (average short/long distance, considering 16/25 passengers)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    },
    AT: {
      regionName: "Austria",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.14351, // HBEFA (passenger car, considering 1 passenger)
        BUS:         0.04625, // HBEFA (average short/long distance, considering 16/25 passengers)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    },
    SE: {
      regionName: "Sweden",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.13458, // HBEFA (passenger car, considering 1 passenger)
        BUS:         0.04557, // HBEFA (average short/long distance, considering 16/25 passengers)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    },
    NO: {
      regionName: "Norway",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.13265, // HBEFA (passenger car, considering 1 passenger)
        BUS:         0.04185, // HBEFA (average short/long distance, considering 16/25 passengers)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    },
    CH: {
      regionName: "Switzerland",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.17638, // HBEFA (passenger car, considering 1 passenger)
        BUS:         0.04866, // HBEFA (average short/long distance, considering 16/25 passengers)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    }
  };

  var defaultCarbonDatasetCode = 'US';
  var currentCarbonDatasetCode = defaultCarbonDatasetCode;

  // we need to call the method from within a promise in initialize()
  // and using this.setCurrentCarbonDatasetLocale doesn't seem to work
  var setCurrentCarbonDatasetLocale = function(localeCode) {
    for (var code in carbonDatasets) {
      if (code == localeCode) {
        currentCarbonDatasetCode = localeCode;
        break;
      }
    }
  }

  this.loadCarbonDatasetLocale = function() {
    return KVStore.get(CARBON_DATASET_KEY).then(function(localeCode) {
      Logger.log("CarbonDatasetHelper.loadCarbonDatasetLocale() obtained value from storage [" + localeCode + "]");
      if (!localeCode) {
        localeCode = defaultCarbonDatasetCode;
        Logger.log("CarbonDatasetHelper.loadCarbonDatasetLocale() no value in storage, using [" + localeCode + "] instead");
      }
      setCurrentCarbonDatasetLocale(localeCode);
    });
  }

  this.saveCurrentCarbonDatasetLocale = function (localeCode) {
    setCurrentCarbonDatasetLocale(localeCode);
    KVStore.set(CARBON_DATASET_KEY, currentCarbonDatasetCode);
    Logger.log("CarbonDatasetHelper.saveCurrentCarbonDatasetLocale() saved value [" + currentCarbonDatasetCode + "] to storage");
  }

  this.getCarbonDatasetOptions = function() {
    var options = [];
    for (var code in carbonDatasets) {
      options.push({
        text: code, //carbonDatasets[code].regionName,
        value: code
      });
    }
    return options;
  };

  this.getCurrentCarbonDatasetCode = function () {
    return currentCarbonDatasetCode;
  };

  this.getCurrentCarbonDatasetFootprint = function () {
    return carbonDatasets[currentCarbonDatasetCode].footprintData;
  };
})

// common configuration methods across all screens
// e.g. maps
// for consistent L&F

.factory('Config', function() {
    var config = {};

    config.getMapTiles = function() {
      return {
          tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          tileLayerOptions: {
              attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
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
