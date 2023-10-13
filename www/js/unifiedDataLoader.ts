import { logInfo } from './plugin/logger'
import { getRawEntries } from './commHelper';

interface dataObj {
  data: any;
  metadata: {
    plugin: string;
    write_ts: number;
    platform: string;
    read_ts: number;
    key: string;
    type: string;
  }
}
const combineWithDedup = function(list1: Array<dataObj>, list2: Array<dataObj>) {
    const combinedList = list1.concat(list2);
    return combinedList.filter(function(value, i, array) {
      const firstIndexOfValue = array.findIndex(function(element) {
        console.log(`==> Element: ${JSON.stringify(element, null, 4)} `);
        return element.metadata.write_ts == value.metadata.write_ts;
      });
      return firstIndexOfValue == i;
    });
};

// TODO: generalize to iterable of promises
const combinedPromise = function(localPromise: Promise<any>, remotePromise: Promise<any>, 
  combiner: (list1: Array<any>, list2: Array<any>) => Array<any>) {
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

// This is an generalized get function for data; example uses could be with
// the getSensorDataForInterval or getMessagesForInterval functions.
interface serverData { 
  phone_data: Array<any>; 
}
interface tQ {
  key: string;
  startTs: number;
  endTs: number;
}
export const getUnifiedDataForInterval = function(key: string, tq: tQ, 
  getMethod: (key: string, tq: tQ, flag: boolean) => Promise<any>) {
    const test = true;
    const localPromise = getMethod(key, tq, test);
    const remotePromise = getRawEntries([key], tq.startTs, tq.endTs)
        .then(function(serverResponse: serverData) {
          return serverResponse.phone_data;
        });
    return combinedPromise(localPromise, remotePromise, combineWithDedup);
};