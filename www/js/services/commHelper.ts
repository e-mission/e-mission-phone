import { DateTime } from 'luxon';
import { displayError, logDebug } from '../plugin/logger';
import { ServerConnConfig } from '../types/appConfigTypes';
import { TimestampRange } from '../types/diaryTypes';

const log = (str, r) => {
  logDebug(str);
  return r;
};

/**
 * @param url URL endpoint for the request
 * @param fetchOpts (optional) options for the fetch request. If 'cache' is set to 'reload', the cache will be ignored
 * @returns Promise of the fetched response (as text) or cached text from local storage
 */
export async function fetchUrlCached(url: string, fetchOpts?: RequestInit) {
  const stored = localStorage.getItem(url);
  if (stored && fetchOpts?.cache != 'reload') {
    logDebug(`fetchUrlCached: found cached data for url ${url}, returning`);
    return Promise.resolve(stored);
  }
  try {
    logDebug(`fetchUrlCached: cache had ${stored} for url ${url}, not using; fetching`);
    const response = await fetch(url, fetchOpts);
    const text = await response.text();
    localStorage.setItem(url, text);
    logDebug(`fetchUrlCached: fetched data for url ${url}, returning`);
    return text;
  } catch (e) {
    displayError(e, `While fetching ${url}`);
  }
}

export function getRawEntries(
  key_list,
  start_ts,
  end_ts,
  time_key = 'metadata.write_ts',
  max_entries = undefined,
  trunc_method = 'sample',
) {
  let prefix = `getRawEntries, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
  return new Promise<any>((rs, rj) => {
    const msgFiller = (message) => {
      message.key_list = key_list;
      message.start_time = start_ts;
      message.end_time = end_ts;
      message.key_time = time_key;
      if (max_entries !== undefined) {
        message.max_entries = max_entries;
        message.trunc_method = trunc_method;
      }
      logDebug(prefix + `message: ${JSON.stringify(message)}`);
    };
    logDebug(prefix + 'calling pushGetJSON on /datastreams/find_entries/timestamp');
    window['cordova'].plugins.BEMServerComm.pushGetJSON(
      '/datastreams/find_entries/timestamp',
      msgFiller,
      rs,
      rj,
    );
  })
    .then((r) => log(prefix + `got ${r.phone_data.length} entries`, r))
    .catch((error) => {
      error = `While getting raw entries, ${error}`;
      throw error;
    });
}

// // time_key is typically metadata.write_ts or data.ts
// export function getRawEntriesForLocalDate(
//   key_list,
//   start_ts,
//   end_ts,
//   time_key = 'metadata.write_ts',
//   max_entries = undefined,
//   trunc_method = 'sample',
// ) {
//   let prefix = `getRawEntriesForLocalDate, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
//   return new Promise<any>((rs, rj) => {
//     const msgFiller = (message) => {
//       message.key_list = key_list;
//       message.from_local_date = DateTime.fromSeconds(start_ts).toObject();
//       message.to_local_date = DateTime.fromSeconds(end_ts).toObject();
//       message.key_local_date = time_key;
//       if (max_entries !== undefined) {
//         message.max_entries = max_entries;
//         message.trunc_method = trunc_method;
//       }
//       logDebug(prefix + `message: ${JSON.stringify(message)}`);
//     };
//     logDebug(prefix + 'calling pushGetJSON on /datastreams/find_entries/local_date');
//     window['cordova'].plugins.BEMServerComm.pushGetJSON(
//       '/datastreams/find_entries/local_date',
//       msgFiller,
//       rs,
//       rj,
//     );
//   })
//     .then((r) => log(prefix + `got ${r.phone_data.length} entries`, r))
//     .catch((error) => {
//       error = 'While getting raw entries for local date, ' + error;
//       throw error;
//     });
// }

export function getPipelineRangeTs(): Promise<TimestampRange> {
  let prefix = `getPipelineRangeTs, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
  return new Promise<TimestampRange>((rs, rj) => {
    logDebug(prefix + 'calling getUserPersonalData on /pipeline/get_range_ts');
    window['cordova'].plugins.BEMServerComm.getUserPersonalData('/pipeline/get_range_ts', rs, rj);
  })
    .then((r) => log(prefix + `got ${JSON.stringify(r)}`, r))
    .catch((error) => {
      error = `While getting pipeline range timestamps, ${error}`;
      throw error;
    });
}

// export function getPipelineCompleteTs() {
//   let prefix = `getPipelineCompleteTs, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
//   return new Promise((rs, rj) => {
//     logDebug(prefix + 'calling getUserPersonalData on /pipeline/get_complete_ts');
//     window['cordova'].plugins.BEMServerComm.getUserPersonalData(
//       '/pipeline/get_complete_ts',
//       rs,
//       rj,
//     );
//   })
//     .then((r) => log(prefix + `got ${JSON.stringify(r)}`, r))
//     .catch((error) => {
//       error = `While getting pipeline complete timestamp, ${error}`;
//       throw error;
//     });
// }

// export function getMetrics(timeType: 'timestamp' | 'local_date', metricsQuery) {
//   let prefix = `getMetrics, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
//   return new Promise<any>((rs, rj) => {
//     const msgFiller = (message) => {
//       for (let key in metricsQuery) {
//         message[key] = metricsQuery[key];
//       }
//       logDebug(prefix + `message: ${JSON.stringify(message)}`);
//     };
//     logDebug(prefix + `calling pushGetJSON on /result/metrics/${timeType}`);
//     window['cordova'].plugins.BEMServerComm.pushGetJSON(
//       `/result/metrics/${timeType}`,
//       msgFiller,
//       rs,
//       rj,
//     );
//   })
//     .then((r) => log(prefix + `got ${r.phone_data.length} entries`, r))
//     .catch((error) => {
//       error = `While getting metrics, ${error}`;
//       throw error;
//     });
// }

export function getAggregateData(path: string, query, serverConnConfig?: ServerConnConfig) {
  let prefix = `getAggregateData, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
  return new Promise<any>((rs, rj) => {
    // when app config does not have "server", localhost is used and no user authentication is required
    serverConnConfig ||= {
      connectUrl: 'http://localhost:8080' as any,
      aggregate_call_auth: 'no_auth',
    };
    const fullUrl = `${serverConnConfig.connectUrl}/${path}`;
    query['aggregate'] = true;

    if (serverConnConfig.aggregate_call_auth == 'no_auth') {
      logDebug(`getting aggregate data without user authentication from ${fullUrl} 
        with arguments ${JSON.stringify(query)}`);
      const options = {
        method: 'post',
        data: query,
        responseType: 'json',
      };
      logDebug(prefix + `calling http.sendRequest on ${fullUrl}`);
      window['cordova'].plugin.http.sendRequest(
        fullUrl,
        options,
        (response) => {
          rs(response.data);
        },
        (error) => {
          rj(error);
        },
      );
    } else {
      logDebug(
        prefix +
          `calling getUserPersonalData on ${fullUrl};
        query: ${JSON.stringify(query)}`,
      );
      const msgFiller = (message) => Object.assign(message, query);
      window['cordova'].plugins.BEMServerComm.pushGetJSON(`/${path}`, msgFiller, rs, rj);
    }
  })
    .then((r) => {
      let summary = Object.entries(r).map(([k, v]: any) => ({ [k]: `<${v.length} entries>` }));
      return log(prefix + `got ${JSON.stringify(summary)}`, r);
    })
    .catch((error) => {
      error = `While getting aggregate data, ${error}`;
      throw error;
    });
}

export function registerUser() {
  let prefix = `registerUser, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
  return new Promise((rs, rj) => {
    logDebug(prefix + 'calling getUserPersonalData on /profile/create');
    window['cordova'].plugins.BEMServerComm.getUserPersonalData('/profile/create', rs, rj);
  })
    .then((r) => log(prefix + `got ${JSON.stringify(r)}`, r))
    .catch((error) => {
      error = `While registering user, ${error}`;
      throw error;
    });
}

export function updateUser(updateDoc) {
  let prefix = `updateUser, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
  return new Promise((rs, rj) => {
    logDebug(prefix + 'calling postUserPersonalData on /profile/update');
    window['cordova'].plugins.BEMServerComm.postUserPersonalData(
      '/profile/update',
      'update_doc',
      updateDoc,
      rs,
      rj,
    );
  })
    .then((r) => log(prefix + `got ${JSON.stringify(r)}`, r))
    .catch((error) => {
      error = `While updating user, ${error}`;
      throw error;
    });
}

export function getUser() {
  let prefix = `getUser, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
  return new Promise((rs, rj) => {
    logDebug(prefix + 'calling getUserPersonalData on /profile/get');
    window['cordova'].plugins.BEMServerComm.getUserPersonalData('/profile/get', rs, rj);
  })
    .then((r) => log(prefix + `got ${JSON.stringify(r)}`, r))
    .catch((error) => {
      error = `While getting user, ${error}`;
      throw error;
    });
}

// export function putOne(key, data) {
//   const nowTs = DateTime.now().toUnixInteger();
//   const metadata = {
//     write_ts: nowTs,
//     read_ts: nowTs,
//     time_zone: DateTime.local().zoneName,
//     type: 'message',
//     key: key,
//     platform: window['device'].platform,
//   };
//   const entryToPut = { metadata, data };
//   return new Promise((rs, rj) => {
//     window['cordova'].plugins.BEMServerComm.postUserPersonalData(
//       '/usercache/putone',
//       'the_entry',
//       entryToPut,
//       rs,
//       rj,
//     );
//   }).catch((error) => {
//     error = 'While putting one entry, ' + error;
//     throw error;
//   });
// }

export function getUserCustomLabels(keys) {
  let prefix = `getUserCustomLabels, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
  return new Promise<any>((rs, rj) => {
    logDebug(prefix + 'calling postUserPersonalData on /customlabel/get');
    window['cordova'].plugins.BEMServerComm.postUserPersonalData(
      '/customlabel/get',
      'keys',
      keys,
      rs,
      rj,
    );
  })
    .then((r) => log(prefix + `got ${JSON.stringify(r)}`, r))
    .catch((error) => {
      error = 'While getting labels, ' + error;
      throw error;
    });
}

export function insertUserCustomLabel(key, label) {
  let prefix = `insertUserCustomLabel, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
  return new Promise((rs, rj) => {
    logDebug(prefix + 'calling postUserPersonalData on /customlabel/insert');
    window['cordova'].plugins.BEMServerComm.postUserPersonalData(
      '/customlabel/insert',
      'inserted_label',
      { key, label },
      rs,
      rj,
    );
  })
    .then((r) => log(prefix + `got ${JSON.stringify(r)}`, r))
    .catch((error) => {
      error = `While inserting one ${key}, ${error}`;
      throw error;
    });
}

export function updateUserCustomLabel(key, old_label, new_label, is_new_label_must_added) {
  let prefix = `updateUserCustomLabel, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
  return new Promise<any>((rs, rj) => {
    logDebug(prefix + 'calling postUserPersonalData on /customlabel/update');
    window['cordova'].plugins.BEMServerComm.postUserPersonalData(
      '/customlabel/update',
      'updated_label',
      { key, old_label, new_label, is_new_label_must_added },
      rs,
      rj,
    );
  })
    .then((r) => log(prefix + `got ${JSON.stringify(r)}`, r))
    .catch((error) => {
      error = `While updating one ${key}, ${error}`;
      throw error;
    });
}

export function deleteUserCustomLabel(key, label) {
  let prefix = `deleteUserCustomLabel, args: ${JSON.stringify(Object.values(arguments))};\n\n`;
  return new Promise((rs, rj) => {
    logDebug(prefix + 'calling postUserPersonalData on /customlabel/delete');
    window['cordova'].plugins.BEMServerComm.postUserPersonalData(
      '/customlabel/delete',
      'deleted_label',
      { key, label },
      rs,
      rj,
    );
  })
    .then((r) => log(prefix + `got ${JSON.stringify(r)}`, r))
    .catch((error) => {
      error = `While deleting one ${key}, ${error}`;
      throw error;
    });
}
