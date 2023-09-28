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
  appVersion ||= window['cordova']?.plugins?.BEMUserCache?.getAppVersion();
  return appVersion;
}

export const getStatsEvent = (name: string, reading: any) => {
  const ts = Date.now() / 1000;
  const client_app_version = getAppVersion();
  const client_os_version = window['device'].version;
  return { name, ts, reading, client_app_version, client_os_version };
}

export const addStatReading = (name: string, reading: any) => {
  const db = window['cordova']?.plugins?.BEMUserCache;
  if (db) return db.putMessage(CLIENT_TIME, getStatsEvent(name, reading));
}

export const addStatEvent = (name: string) => {
  const db = window['cordova']?.plugins?.BEMUserCache;
  if (db) return db.putMessage(CLIENT_NAV_EVENT, getStatsEvent(name, null));
}

export const addStatError = (name: string, errorStr: string) => {
  const db = window['cordova']?.plugins?.BEMUserCache;
  if (db) return db.putMessage(CLIENT_ERROR, getStatsEvent(name, errorStr));
}
