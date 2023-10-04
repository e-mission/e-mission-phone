import i18next from "i18next";
import { displayError, logDebug, logWarn } from "../plugin/logger";
import { getAngularService } from "../angular-react-helper";
import { fetchUrlCached } from "../commHelper";

export const CONFIG_PHONE_UI="config/app_ui_config";
export const CONFIG_PHONE_UI_KVSTORE ="CONFIG_PHONE_UI";

export let storedConfig = null;
export let configChanged = false;
export const setConfigChanged = (b) => configChanged = b;

const _getStudyName = function (connectUrl) {
  const orig_host = new URL(connectUrl).hostname;
  const first_domain = orig_host.split(".")[0];
  if (first_domain == "openpath-stage") { return "stage"; }
  const openpath_index = first_domain.search("-openpath");
  if (openpath_index == -1) { return undefined; }
  const study_name = first_domain.substr(0, openpath_index);
  return study_name;
}

const _fillStudyName = function (config) {
  if (!config.name) {
    if (config.server) {
      config.name = _getStudyName(config.server.connectUrl);
    } else {
      config.name = "dev";
    }
  }
}

const _backwardsCompatSurveyFill = function (config) {
  if (!config.survey_info) {
    config.survey_info = {
      "surveys": {
        "UserProfileSurvey": {
          "formPath": "json/demo-survey-v2.json",
          "version": 1,
          "compatibleWith": 1,
          "dataKey": "manual/demographic_survey",
          "labelTemplate": {
            "en": "Answered",
            "es": "Contestada"
          }
        }
      },
      "trip-labels": "MULTILABEL"
    }
  }
}

/* Fetch and cache any surveys resources that are referenced by URL in the config,
  as well as the label_options config if it is present.
  This way they will be available when the user needs them, and we won't have to
  fetch them again unless local storage is cleared. */
const cacheResourcesFromConfig = (config) => {
  if (config.survey_info?.surveys) {
    Object.values(config.survey_info.surveys).forEach((survey) => {
      if (!survey?.['formPath'])
        throw new Error(i18next.t('config.survey-missing-formpath'));
      fetchUrlCached(survey['formPath']);
    });
  }
  if (config.label_options) {
    fetchUrlCached(config.label_options);
  }
}

const readConfigFromServer = async (label) => {
  const config = await fetchConfig(label);
  logDebug("Successfully found config, result is " + JSON.stringify(config).substring(0, 10));

  // fetch + cache any resources referenced in the config, but don't 'await' them so we don't block
  // the config loading process
  cacheResourcesFromConfig(config);

  const connectionURL = config.server ? config.server.connectUrl : "dev defaults";
  _fillStudyName(config);
  _backwardsCompatSurveyFill(config);
  logDebug("Successfully downloaded config with version " + config.version
    + " for " + config.intro.translated_text.en.deployment_name
    + " and data collection URL " + connectionURL);
  return config;
}

const fetchConfig = async (label, alreadyTriedLocal = false) => {
  logDebug("Received request to join " + label);
  const downloadURL = `https://raw.githubusercontent.com/e-mission/nrel-openpath-deploy-configs/main/configs/${label}.nrel-op.json`;
  if (!__DEV__ || alreadyTriedLocal) {
    logDebug("Fetching config from github");
    const r = await fetch(downloadURL);
    if (!r.ok) throw new Error('Unable to fetch config from github');
    return r.json();
  }
  else {
    logDebug("Running in dev environment, checking for locally hosted config");
    try {
      const r = await fetch('http://localhost:9090/configs/' + label + '.nrel-op.json');
      if (!r.ok) throw new Error('Local config not found');
      return r.json();
    } catch (err) {
      logDebug("Local config not found");
      return fetchConfig(label, true);
    }
  }
}

/*
 * We want to support both old style and new style tokens.
 * Theoretically, we don't need anything from this except the study
 * name, but we should re-validate the token for extra robustness.
 * The control flow here is a bit tricky, though.
 * - we need to first get the study name
 * - then we need to retrieve the study config
 * - then we need to re-validate the token against the study config,
 * and the subgroups in the study config, in particular.
 *
 * So let's support two separate functions here - extractStudyName and extractSubgroup
 */
function extractStudyName(token) {
  const tokenParts = token.split("_");
  if (tokenParts.length < 3) {
    // all tokens must have at least nrelop_[study name]_...
    throw new Error(i18next.t('config.not-enough-parts-old-style', { "token": token }));
  }
  if (tokenParts[0] != "nrelop") {
    throw new Error(i18next.t('config.no-nrelop-start', { token: token }));
  }
  return tokenParts[1];
}

function extractSubgroup(token, config) {
  if (config.opcode) {
    // new style study, expects token with sub-group
    const tokenParts = token.split("_");
    if (tokenParts.length <= 3) { // no subpart defined
      throw new Error(i18next.t('config.not-enough-parts', { token: token }));
    }
    if (config.opcode.subgroups) {
      if (config.opcode.subgroups.indexOf(tokenParts[2]) == -1) {
        // subpart not in config list
        throw new Error(i18next.t('config.invalid-subgroup', { token: token, subgroup: tokenParts[2], config_subgroups: config.opcode.subgroups }));
      } else {
        console.log("subgroup " + tokenParts[2] + " found in list " + config.opcode.subgroups);
        return tokenParts[2];
      }
    } else {
      if (tokenParts[2] != "default") {
        // subpart not in config list
        throw new Error(i18next.t('config.invalid-subgroup-no-default', { token: token }));
      } else {
        console.log("no subgroups in config, 'default' subgroup found in token ");
        return tokenParts[2];
      }
    }
  } else {
    /* old style study, expect token without subgroup
     * nothing further to validate at this point
     * only validation required is `nrelop_` and valid study name
     * first is already handled in extractStudyName, second is handled
     * by default since download will fail if it is invalid
    */
    console.log("Old-style study, expecting token without a subgroup...");
    return undefined;
  }
}

/**
* loadNewConfig download and load a new config from the server if it is a differ
* @param {[]} newToken the new token, which includes parts for the study label, subgroup, and user
* @param {} thenGoToIntro whether to go to the intro screen after loading the config
* @param {} [existingVersion=null] if the new config's version is the same, we won't update
* @returns {boolean} boolean representing whether the config was updated or not
*/
function loadNewConfig(newToken, existingVersion = null) {
  const KVStore = getAngularService('KVStore');
  const newStudyLabel = extractStudyName(newToken);
  return readConfigFromServer(newStudyLabel).then((downloadedConfig) => {
    if (downloadedConfig.version == existingVersion) {
      logDebug("UI_CONFIG: Not updating config because version is the same");
      return Promise.resolve(false);
    }
    // we want to validate before saving because we don't want to save
    // an invalid configuration
    const subgroup = extractSubgroup(newToken, downloadedConfig);
    const toSaveConfig = {
      ...downloadedConfig,
      joined: { opcode: newToken, study_name: newStudyLabel, subgroup: subgroup }
    }
    const storeConfigPromise = window['cordova'].plugins.BEMUserCache.putRWDocument(
      CONFIG_PHONE_UI, toSaveConfig);
    const storeInKVStorePromise = KVStore.set(CONFIG_PHONE_UI_KVSTORE, toSaveConfig);
    // loaded new config, so it is both ready and changed
    return Promise.all([storeConfigPromise, storeInKVStorePromise]).then(
      ([result, kvStoreResult]) => {
        logDebug("UI_CONFIG: Stored dynamic config in KVStore successfully, result = " + JSON.stringify(kvStoreResult));
        storedConfig = toSaveConfig;
        configChanged = true;
        return true;
      }).catch((storeError) =>
        displayError(storeError, i18next.t('config.unable-to-store-config'))
      );
  }).catch((fetchErr) => {
    displayError(fetchErr, i18next.t('config.unable-download-config'));
  });
}

export function initByUser(urlComponents) {
  const { token } = urlComponents;
  try {
    return loadNewConfig(token)
      .catch((fetchErr) => {
        displayError(fetchErr, i18next.t('config.unable-download-config'));
      });
  } catch (error) {
    displayError(error, i18next.t('config.invalid-opcode-format'));
    return Promise.reject(error);
  }
}

export function resetDataAndRefresh() {
  const KVStore = getAngularService('KVStore');
  const resetNativePromise = window['cordova'].plugins.BEMUserCache.putRWDocument(CONFIG_PHONE_UI, {});
  const resetKVStorePromise = KVStore.clearAll();
  return Promise.all([resetNativePromise, resetKVStorePromise])
    .then(() => window.location.reload());
}

export function getConfig() {
  if (storedConfig) return Promise.resolve(storedConfig);
  const KVStore = getAngularService('KVStore');
  return KVStore.get(CONFIG_PHONE_UI_KVSTORE).then((config) => {
    if (config) {
      storedConfig = config;
      return config;
    }
    logDebug("No config found in KVStore, fetching from native storage");
    return window['cordova'].plugins.BEMUserCache.getDocument(CONFIG_PHONE_UI, false).then((config) => {
      if (config && Object.keys(config).length) {
        storedConfig = config;
        return config;
      }
      logWarn("No config found in native storage either. Returning null");
      return null;
    });
  });
}
