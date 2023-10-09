'use strict';

import angular from 'angular';
import { getRawEntries } from './commHelper';
import { logInfo} from './plugin/logger'
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
.service('UnifiedDataLoader', function($window) {
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
                logInfo("About to dedup localResult = "+localResult.length
                    +"remoteResult = "+remoteResult.length);
                var dedupedList = combiner(localResult, remoteResult);
                logInfo("Deduped list = "+dedupedList.length);
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
