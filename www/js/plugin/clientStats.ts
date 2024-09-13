import { displayErrorMsg, logDebug } from './logger';

const CLIENT_TIME = 'stats/client_time';
const CLIENT_ERROR = 'stats/client_error';

type StatKey =
  | 'app_state_change'
  | 'nav_tab_change'
  | 'view_trip_details'
  | 'multilabel_open'
  | 'multilabel_choose'
  | 'set_reminder_prefs'
  | 'force_sync'
  | 'open_notification'
  | 'missing_keys'
  | 'ui_error';

let appVersion;
export function getAppVersion() {
  if (appVersion) return Promise.resolve(appVersion);
  return window['cordova']?.getAppVersion.getVersionNumber().then((version) => {
    appVersion = version;
    return version;
  });
}

async function getStatsEvent(name: StatKey, reading?: any) {
  const ts = Date.now() / 1000;
  const client_app_version = await getAppVersion();
  const client_os_version = window['device'].version;
  reading = reading || null;
  return { name, ts, reading, client_app_version, client_os_version };
}

export async function addStatReading(name: StatKey, reading?: any) {
  const db = window['cordova']?.plugins?.BEMUserCache;
  const event = await getStatsEvent(name, reading);
  logDebug('addStatReading: adding CLIENT_TIME event: ' + JSON.stringify(event));
  if (db) return db.putMessage(CLIENT_TIME, event);
  displayErrorMsg('addStatReading: db is not defined');
}

export async function addStatError(errorMsg: string) {
  const db = window['cordova']?.plugins?.BEMUserCache;
  const event = await getStatsEvent('ui_error', errorMsg);
  logDebug('addStatError: adding CLIENT_ERROR event: ' + JSON.stringify(event));
  if (db) return db.putMessage(CLIENT_ERROR, event);
  displayErrorMsg('addStatError: db is not defined');
}
