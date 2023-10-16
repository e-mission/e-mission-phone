import { getAngularService } from "../angular-react-helper";
import { addStatReading, statKeys } from "./clientStats";
import { logDebug, logWarn } from "./logger";

const mungeValue = (key, value) => {
  let store_val = value;
  if (typeof value != "object") {
    store_val = {};
    store_val[key] = value;
  }
  return store_val;
}

/*
 * If a non-JSON object was munged for storage, unwrap it.
 */
const unmungeValue = (key, retData) => {
  if (retData?.[key]) {
    // it must have been a simple data type that we munged upfront
    return retData[key];
  } else {
    // it must have been an object
    return retData;
  }
}

const localStorageSet = (key: string, value: {[k: string]: any}) => {
  localStorage.setItem(key, JSON.stringify(value));
}

const localStorageGet = (key: string) => {
  const value = localStorage.getItem(key);
  if (value) {
    return JSON.parse(value);
  } else {
    return null;
  }
}

/* We redundantly store data in both local and native storage. This function checks
    both for a value. If a value is present in only one, it copies it to the other and returns it.
  If a value is present in both, but they are different, it copies the native value to
    local storage and returns it. */
function getUnifiedValue(key) {
  const ls_stored_val = localStorageGet(key);
  return window['cordova'].plugins.BEMUserCache.getLocalStorage(key, false).then((uc_stored_val) => {
    logDebug(`for key ${key}, uc_stored_val = ${JSON.stringify(uc_stored_val)},
                                  ls_stored_val = ${JSON.stringify(ls_stored_val)}.`);

    /* compare stored values by stringified JSON equality, not by == or ===.
      for objects, == or === only compares the references, not the contents of the objects */
    if (JSON.stringify(ls_stored_val) == JSON.stringify(uc_stored_val)) {
      logDebug("local and native values match, already synced");
      return uc_stored_val;
    } else {
      // the values are different
      if (ls_stored_val == null) {
        // local value is missing, fill it in from native
        console.assert(uc_stored_val != null, "uc_stored_val should be non-null");
        logWarn(`for key ${key}, uc_stored_val = ${JSON.stringify(uc_stored_val)},
                                      ls_stored_val = ${JSON.stringify(ls_stored_val)}.
                                      copying native ${key} to local...`);
        localStorageSet(key, uc_stored_val);
        return uc_stored_val;
      } else if (uc_stored_val == null) {
        // native value is missing, fill it in from local
        console.assert(ls_stored_val != null);
        logWarn(`for key ${key}, uc_stored_val = ${JSON.stringify(uc_stored_val)},
                                      ls_stored_val = ${JSON.stringify(ls_stored_val)}.
                                      copying local ${key} to native...`);
        return window['cordova'].plugins.BEMUserCache.putLocalStorage(key, ls_stored_val).then(() => {
          // we only return the value after we have finished writing
          return ls_stored_val;
        });
      }
      // both values are present, but they are different
      console.assert(ls_stored_val != null && uc_stored_val != null,
        "ls_stored_val =" + JSON.stringify(ls_stored_val) +
        "uc_stored_val =" + JSON.stringify(uc_stored_val));
      logWarn(`for key ${key}, uc_stored_val = ${JSON.stringify(uc_stored_val)},
                    ls_stored_val = ${JSON.stringify(ls_stored_val)}.
                    copying native ${key} to local...`);
      localStorageSet(key, uc_stored_val);
      return uc_stored_val;
    }
  });
}

export function storageSet(key: string, value: any) {
  const storeVal = mungeValue(key, value);
  /*
   * How should we deal with consistency here? Have the threads be
   * independent so that there is greater chance that one will succeed,
   * or the local only succeed if native succeeds. I think parallel is
   * better for greater robustness.
   */
  localStorageSet(key, storeVal);
  return window['cordova'].plugins.BEMUserCache.putLocalStorage(key, storeVal);
}

export function storageGet(key: string) {
  return getUnifiedValue(key).then((retData) => unmungeValue(key, retData));
}

export function storageRemove(key: string) {
  localStorage.removeItem(key);
  return window['cordova'].plugins.BEMUserCache.removeLocalStorage(key);
}

export function storageClear({ local, native }: { local?: boolean, native?: boolean }) {
  if (local) localStorage.clear();
  if (native) return window['cordova'].plugins.BEMUserCache.clearAll();
  return Promise.resolve();
}

export function storageGetDirect(key: string) {
  // will run in background, we won't wait for the results
  getUnifiedValue(key);
  return unmungeValue(key, localStorageGet(key));
}

function findMissing(fromKeys, toKeys) {
  const foundKeys = [];
  const missingKeys = [];
  fromKeys.forEach((fk) => {
    if (toKeys.includes(fk)) {
      foundKeys.push(fk);
    } else {
      missingKeys.push(fk);
    }
  });
  return [foundKeys, missingKeys];
}

export function storageSyncLocalAndNative() {
  console.log("STORAGE_PLUGIN: Called syncAllWebAndNativeValues ");
  const syncKeys = window['cordova'].plugins.BEMUserCache.listAllLocalStorageKeys().then((nativeKeys) => {
    console.log("STORAGE_PLUGIN: native plugin returned");
    const webKeys = Object.keys(localStorage);
    // I thought about iterating through the lists and copying over
    // only missing values, etc but `getUnifiedValue` already does
    // that, and we don't need to copy it
    // so let's just find all the missing values and read them
    logDebug("STORAGE_PLUGIN: Comparing web keys " + webKeys + " with " + nativeKeys);
    let [foundNative, missingNative] = findMissing(webKeys, nativeKeys);
    let [foundWeb, missingWeb] = findMissing(nativeKeys, webKeys);
    logDebug("STORAGE_PLUGIN: Found native keys " + foundNative + " missing native keys " + missingNative);
    logDebug("STORAGE_PLUGIN: Found web keys " + foundWeb + " missing web keys " + missingWeb);
    const allMissing = missingNative.concat(missingWeb);
    logDebug("STORAGE_PLUGIN: Syncing all missing keys " + allMissing);
    allMissing.forEach(getUnifiedValue);
    if (allMissing.length != 0) {
      addStatReading(statKeys.MISSING_KEYS, {
        "type": "local_storage_mismatch",
        "allMissingLength": allMissing.length,
        "missingWebLength": missingWeb.length,
        "missingNativeLength": missingNative.length,
        "foundWebLength": foundWeb.length,
        "foundNativeLength": foundNative.length,
        "allMissing": allMissing,
      }).then(logDebug("Logged missing keys to client stats"));
    }
  });
  const listAllKeys = window['cordova'].plugins.BEMUserCache.listAllUniqueKeys().then((nativeKeys) => {
    logDebug("STORAGE_PLUGIN: For the record, all unique native keys are " + nativeKeys);
    if (nativeKeys.length == 0) {
      addStatReading(statKeys.MISSING_KEYS, {
        "type": "all_native",
      }).then(logDebug("Logged all missing native keys to client stats"));
    }
  });

  return Promise.all([syncKeys, listAllKeys]);
}
