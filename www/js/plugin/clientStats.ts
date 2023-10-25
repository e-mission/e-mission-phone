import { displayErrorMsg } from "./logger";

const CLIENT_TIME = "stats/client_time";
const CLIENT_ERROR = "stats/client_error";
const CLIENT_NAV_EVENT = "stats/client_nav_event";

export const statKeys = {
  STATE_CHANGED: "state_changed",
  BUTTON_FORCE_SYNC: "button_sync_forced",
  CHECKED_DIARY: "checked_diary",
  DIARY_TIME: "diary_time",
  METRICS_TIME: "metrics_time",
  CHECKED_INF_SCROLL: "checked_inf_scroll",
  INF_SCROLL_TIME: "inf_scroll_time",
  VERIFY_TRIP: "verify_trip",
  LABEL_TAB_SWITCH: "label_tab_switch",
  SELECT_LABEL: "select_label",
  EXPANDED_TRIP: "expanded_trip",
  NOTIFICATION_OPEN: "notification_open",
  REMINDER_PREFS: "reminder_time_prefs",
  MISSING_KEYS: "missing_keys"
};

let appVersion;
export const getAppVersion = () => {
  if (appVersion) return Promise.resolve(appVersion);
  return window['cordova']?.getAppVersion.getVersionNumber().then((version) => {
    appVersion = version;
    return version;
  });
}

const getStatsEvent = async (name: string, reading: any) => {
  const ts = Date.now() / 1000;
  const client_app_version = await getAppVersion();
  const client_os_version = window['device'].version;
  return { name, ts, reading, client_app_version, client_os_version };
}

export const addStatReading = async (name: string, reading: any) => {
  const db = window['cordova']?.plugins?.BEMUserCache;
  const event = await getStatsEvent(name, reading);
  if (db) return db.putMessage(CLIENT_TIME, event);
  displayErrorMsg("addStatReading: db is not defined");
}

export const addStatEvent = async (name: string) => {
  const db = window['cordova']?.plugins?.BEMUserCache;
  const event = await getStatsEvent(name, null);
  if (db) return db.putMessage(CLIENT_NAV_EVENT, event);
  displayErrorMsg("addStatEvent: db is not defined");
}

export const addStatError = async (name: string, errorStr: string) => {
  const db = window['cordova']?.plugins?.BEMUserCache;
  const event = await getStatsEvent(name, errorStr);
  if (db) return db.putMessage(CLIENT_ERROR, event);
  displayErrorMsg("addStatError: db is not defined");
}
