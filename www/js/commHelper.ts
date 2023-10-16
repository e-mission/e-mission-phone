import { DateTime } from "luxon";
import { logDebug } from "./plugin/logger";

/**
 * @param url URL endpoint for the request
 * @returns Promise of the fetched response (as text) or cached text from local storage
 */
export async function fetchUrlCached(url) {
  const stored = localStorage.getItem(url);
  if (stored) {
    logDebug(`fetchUrlCached: found cached data for url ${url}, returning`);
    return Promise.resolve(stored);
  }
  logDebug(`fetchUrlCached: found no cached data for url ${url}, fetching`);
  const response = await fetch(url);
  const text = await response.text();
  localStorage.setItem(url, text);
  logDebug(`fetchUrlCached: fetched data for url ${url}, returning`);
  return text;
}

export function getRawEntries(key_list, start_ts, end_ts, time_key = "metadata.write_ts",
                              max_entries = undefined, trunc_method = "sample") {
  return new Promise((rs, rj) => {
    const msgFiller = (message) => {
      message.key_list = key_list;
      message.start_time = start_ts;
      message.end_time = end_ts;
      message.key_time = time_key;
      if (max_entries !== undefined) {
        message.max_entries = max_entries;
        message.trunc_method = trunc_method;
      }
      logDebug(`About to return message ${JSON.stringify(message)}`);
    }
    logDebug("getRawEntries: about to get pushGetJSON for the timestamp");
    window['cordova'].plugins.BEMServerComm.pushGetJSON("/datastreams/find_entries/timestamp", msgFiller, rs, rj);
  }).catch(error => {
    error = `While getting raw entries, ${error}`;
    throw(error);
  });
}

// time_key is typically metadata.write_ts or data.ts
export function getRawEntriesForLocalDate(key_list, start_ts, end_ts, time_key = "metadata.write_ts",
                                          max_entries = undefined, trunc_method = "sample") {
  return new Promise((rs, rj) => {
    const msgFiller = (message) => {
      message.key_list = key_list;
      message.from_local_date = DateTime.fromSeconds(start_ts).toObject();
      message.to_local_date = DateTime.fromSeconds(end_ts).toObject();
      message.key_local_date = time_key;
      if (max_entries !== undefined) {
        message.max_entries = max_entries;
        message.trunc_method = trunc_method;
      }
      logDebug("About to return message " + JSON.stringify(message));
    };
    logDebug("getRawEntries: about to get pushGetJSON for the timestamp");
    window['cordova'].plugins.BEMServerComm.pushGetJSON("/datastreams/find_entries/local_date", msgFiller, rs, rj);
  }).catch(error => {
    error = "While getting raw entries for local date, " + error;
    throw (error);
  });
};

export function getPipelineRangeTs() {
  return new Promise((rs, rj) => {
    logDebug("getting pipeline range timestamps");
    window['cordova'].plugins.BEMServerComm.getUserPersonalData("/pipeline/get_range_ts", rs, rj);
  }).catch(error => {
    error = `While getting pipeline range timestamps, ${error}`;
    throw(error);
  });
}

export function getPipelineCompleteTs() {
  return new Promise((rs, rj) => {
    logDebug("getting pipeline complete timestamp");
    window['cordova'].plugins.BEMServerComm.getUserPersonalData("/pipeline/get_complete_ts", rs, rj);
  }).catch(error => {
    error = `While getting pipeline complete timestamp, ${error}`;
    throw(error);
  });
}

export function getMetrics(timeType: 'timestamp'|'local_date', metricsQuery) {
  return new Promise((rs, rj) => {
    const msgFiller = (message) => {
      for (let key in metricsQuery) {
        message[key] = metricsQuery[key];
      }
    }
    window['cordova'].plugins.BEMServerComm.pushGetJSON(`/result/metrics/${timeType}`, msgFiller, rs, rj);
  }).catch(error => {
    error = `While getting metrics, ${error}`;
    throw(error);
  });
}

export function getAggregateData(path: string, data: any) {
  return new Promise((rs, rj) => {
    const fullUrl = `${window['$rootScope'].connectUrl}/${path}`;
    data["aggregate"] = true;

    if (window['$rootScope'].aggregateAuth === "no_auth") {
      logDebug(`getting aggregate data without user authentication from ${fullUrl} with arguments ${JSON.stringify(data)}`);
      const options = {
        method: 'post',
        data: data,
        responseType: 'json'
      }
      window['cordova'].plugin.http.sendRequest(fullUrl, options,
        (response) => {
          rs(response.data);
        }, (error) => {
          rj(error);
        });
    } else {
      logDebug(`getting aggregate data with user authentication from ${fullUrl} with arguments ${JSON.stringify(data)}`);
      const msgFiller = (message) => {
        return Object.assign(message, data);
      }
      window['cordova'].plugins.BEMServerComm.pushGetJSON(`/${path}`, msgFiller, rs, rj);
    }
  }).catch(error => {
    error = `While getting aggregate data, ${error}`;
    throw(error);
  });
}

export function registerUser() {
  return new Promise((rs, rj) => {
    window['cordova'].plugins.BEMServerComm.getUserPersonalData("/profile/create", rs, rj);
  }).catch(error => {
    error = `While registering user, ${error}`;
    throw(error);
  });
}

export function updateUser(updateDoc) {
  return new Promise((rs, rj) => {
    window['cordova'].plugins.BEMServerComm.postUserPersonalData("/profile/update", "update_doc", updateDoc, rs, rj);
  }).catch(error => {
    error = `While updating user, ${error}`;
    throw(error);
  });
}

export function getUser() {
  return new Promise((rs, rj) => {
    window['cordova'].plugins.BEMServerComm.getUserPersonalData("/profile/get", rs, rj);
  }).catch(error => {
    error = `While getting user, ${error}`;
    throw(error);
  });
}

export function putOne(key, data) {
  const nowTs = DateTime.now().toUnixInteger();
  const metadata = {
    write_ts: nowTs,
    read_ts: nowTs,
    time_zone: DateTime.local().zoneName,
    type: "message",
    key: key,
    platform: window['device'].platform,
  };
  const entryToPut = { metadata, data };
  return new Promise((rs, rj) => {
    window['cordova'].plugins.BEMServerComm.postUserPersonalData("/usercache/putone", "the_entry", entryToPut, rs, rj);
  }).catch(error => {
    error = "While putting one entry, " + error;
    throw(error);
  });
};
