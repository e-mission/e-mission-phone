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
/**
 * combineWithDedup is a helper function for combinedPromises 
 * @param list1 values evaluated from a BEMUserCache promise
 * @param list2 same as list1 
 * @returns a dedup array generated from the input lists
 */
const combineWithDedup = function(list1: Array<dataObj>, list2: Array<dataObj>) {
    const combinedList = list1.concat(list2);
    return combinedList.filter(function(value, i, array) {
      const firstIndexOfValue = array.findIndex(function(element) {
        return element.metadata.write_ts == value.metadata.write_ts;
      });
      return firstIndexOfValue == i;
    });
};

/**
 * combinedPromises is a recursive function that joins multiple promises 
 * @param promiseList 1 or more promises 
 * @param combiner a function that takes two arrays and joins them
 * @returns A promise which evaluates to a combined list of values or errors
 */
const combinedPromises = function(promiseList: Array<Promise<any>>, 
  combiner: (list1: Array<any>, list2: Array<any>) => Array<any> ) {
    return new Promise(function(resolve, reject) {
      var firstResult = [];
      var firstError = null;

      var nextResult = [];
      var nextError = null;

      var firstPromiseDone = false;
      var nextPromiseDone = false;

      const checkAndResolve = function() {
        if (firstPromiseDone && nextPromiseDone) {
          if (firstError && nextError) {
            reject([firstError, nextError]);
          } else {
            logInfo("About to dedup localResult = "+firstResult.length
                +"remoteResult = "+nextResult.length);

            const dedupedList = combiner(firstResult, nextResult);
            logInfo("Deduped list = "+dedupedList.length);
            resolve(dedupedList);
          }
        }
      };
      
      if (promiseList.length === 1) {
        return promiseList[0].then(function(result: Array<any>) {
          resolve(result);
        }, function (err) {
          reject([err]);
        });
      }

      const firstPromise = promiseList[0];
      const nextPromise = combinedPromises(promiseList.slice(1), combiner);
     
      firstPromise.then(function(currentFirstResult: Array<any>) {
        firstResult = currentFirstResult;
        firstPromiseDone = true;
      }, function(error) {
        firstResult = [];
        firstError = error;
        nextPromiseDone = true;
      }).then(checkAndResolve);

      nextPromise.then(function(currentNextResult: Array<any>) {
        nextResult = currentNextResult;
        nextPromiseDone = true;
      }, function(error) {
        nextResult = [];
        nextError = error;
      }).then(checkAndResolve);
    });
};

interface serverData { 
  phone_data: Array<any>; 
}
interface tQ {
  key: string;
  startTs: number;
  endTs: number;
}
/**
 * getUnifiedDataForInterval is a generalized method to fetch data by its timestamps 
 * @param key string corresponding to a data entry
 * @param tq an object that contains interval start and end times
 * @param getMethod a BEMUserCache method that fetches certain data via a promise
 * @returns A promise that evaluates to the all values found within the queried data
 */
export const getUnifiedDataForInterval = function(key: string, tq: tQ, 
  getMethod: (key: string, tq: tQ, flag: boolean) => Promise<any>) {
    const test = true;
    const localPromise = getMethod(key, tq, test);
    const remotePromise = getRawEntries([key], tq.startTs, tq.endTs)
        .then(function(serverResponse: serverData) {
          return serverResponse.phone_data;
        });
    var promiseList = [localPromise, remotePromise]
    return combinedPromises(promiseList, combineWithDedup);
};