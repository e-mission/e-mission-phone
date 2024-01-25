import { getRawEntries } from './commHelper';
import { ServerResponse, BEMData, TimeQuery } from '../types/serverData';

/**
 * removeDup is a helper function for combinedPromises
 * @param list An array of values from a BEMUserCache promise
 * @returns an array with duplicate values removed
 */
export const removeDup = function (list: Array<BEMData<any>>) {
  return list.filter(function (value, i, array) {
    const firstIndexOfValue = array.findIndex(function (element) {
      return element.metadata.write_ts == value.metadata.write_ts;
    });
    return firstIndexOfValue == i;
  });
};

export const combinedPromises = function (
  promiseList: Array<Promise<any>>,
  filter: (list: Array<any>) => Array<any>,
) {
  if (promiseList.length === 0) {
    throw new RangeError('combinedPromises needs input array.length >= 1');
  }
  return new Promise(function (resolve, reject) {
    Promise.allSettled(promiseList).then(
      (results) => {
        let allRej = true;
        const values = [];
        const rejections = [];
        results.forEach((item) => {
          if (item.status === 'fulfilled') {
            if (allRej) allRej = false;
            if (item.value.length != 0) values.push(item.value);
          } else rejections.push(item.reason);
        });
        if (allRej) reject(rejections);
        else resolve(filter(values.flat(1)));
      },
      (err) => {
        reject(err);
      },
    );
  });
};

/**
 * getUnifiedDataForInterval is a generalized method to fetch data by its timestamps
 * @param key string corresponding to a data entry
 * @param tq an object that contains interval start and end times
 * @param localGetMethod a BEMUserCache method that fetches certain data via a promise
 * @returns A promise that evaluates to the all values found within the queried data
 */
export const getUnifiedDataForInterval = function (
  key: string,
  tq: TimeQuery,
  localGetMethod: (key: string, tq: TimeQuery, flag: boolean) => Promise<any>,
) {
  const test = true;
  const getPromise = localGetMethod(key, tq, test);
  const remotePromise = getRawEntries([key], tq.startTs, tq.endTs).then(function (
    serverResponse: ServerResponse<any>,
  ) {
    return serverResponse.phone_data;
  });
  const promiseList = [getPromise, remotePromise];
  return combinedPromises(promiseList, removeDup);
};
