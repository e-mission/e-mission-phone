import { logDebug } from "../plugin/logger";

export async function setServerConnSettings(config) {
  if (!config) return Promise.resolve(null);
  if (config.server) {
    logDebug("connectionConfig = " + JSON.stringify(config.server));
    return window['cordova'].plugins.BEMConnectionSettings.setSettings(config.server);
  } else {
    const defaultConfig = await window['cordova'].plugins.BEMConnectionSettings.getDefaultSettings();
    logDebug("defaultConfig = " + JSON.stringify(defaultConfig));
    return window['cordova'].plugins.BEMConnectionSettings.setSettings(defaultConfig);
  }
}
