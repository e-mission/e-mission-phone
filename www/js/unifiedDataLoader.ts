import { logInfo } from './plugin/logger'
import { getRawEntries } from './commHelper';

// Helper Functions for the getUnified methods.
const combineWithDedup = function(list1, list2) {
    const combinedList = list1.concat(list2);
    return combinedList.filter(function(value, i, array) {
      const firstIndexOfValue = array.findIndex(function(element, index, array) {
        return element.metadata.write_ts == value.metadata.write_ts;
      });
      return firstIndexOfValue == i;
    });
};

// TODO: generalize to iterable of promises
const combinedPromise = function(localPromise, remotePromise, combiner) {
    return new Promise(function(resolve, reject) {
      var localResult = [];
      var localError = null;

      var remoteResult = [];
      var remoteError = null;

      var localPromiseDone = false;
      var remotePromiseDone = false;

      const checkAndResolve = function() {
        if (localPromiseDone && remotePromiseDone) {
          // time to return from this promise
          if (localError && remoteError) {
            reject([localError, remoteError]);
          } else {
            logInfo("About to dedup localResult = "+localResult.length
                +"remoteResult = "+remoteResult.length);
            const dedupedList = combiner(localResult, remoteResult);
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

interface serverData { 
  phone_data: Array<any>; 
}
interface tQ {
  key: string;
  startTs: number;
  endTs: number;
}
// TODO: Generalize this to work for both sensor data and messages
// Do we even need to separate the two kinds of data?
export const getUnifiedSensorDataForInterval = function(key: string, tq: tQ) {
        const localPromise = window['cordova'].plugins.BEMUserCache.getSensorDataForInterval(key, tq, true);
        const remotePromise = getRawEntries([key], tq.startTs, tq.endTs)
          .then(function(serverResponse: serverData) {
            console.log(`\n\n\n TQ : ${JSON.stringify(tq)}`)
            return serverResponse.phone_data;
          });
        return combinedPromise(localPromise, remotePromise, combineWithDedup);
};

export const getUnifiedMessagesForInterval = function(key: string, tq: tQ) {
      const localPromise = window['cordova'].plugins.BEMUserCache.getMessagesForInterval(key, tq, true);
      const remotePromise = getRawEntries([key], tq.startTs, tq.endTs)
          .then(function(serverResponse: serverData) {
            console.log('==>', JSON.stringify(tq.endTs), ':',typeof tq.endTs);
            return serverResponse.phone_data;
          });
      return combinedPromise(localPromise, remotePromise, combineWithDedup);
    }
