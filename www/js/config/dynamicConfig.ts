import i18next from 'i18next';
import { displayError, logDebug, logWarn } from '../plugin/logger';
import { fetchUrlCached } from '../services/commHelper';
import { storageClear, storageGet, storageSet } from '../plugin/storage';
import { AppConfig } from '../types/appConfigTypes';
import {
  getStudyNameFromToken,
  getStudyNameFromUrl,
  getSubgroupFromToken,
  getTokenFromUrl,
} from './opcode';

export const CONFIG_PHONE_UI = 'config/app_ui_config';
export const CONFIG_PHONE_UI_KVSTORE = 'CONFIG_PHONE_UI';

export let _promisedConfig: Promise<AppConfig | null> | undefined;
export let configChanged = false;
export const setConfigChanged = (b) => (configChanged = b);

// used to test multiple configs, not used outside of test
export const _test_resetPromisedConfig = () => {
  _promisedConfig = undefined;
};

/**
 * @param config The app config which might be missing 'name'
 * @returns Shallow copy of the app config with 'name' filled in if it was missing
 */
function _fillStudyName(config: Partial<AppConfig>): AppConfig {
  if (config.name) return config as AppConfig;
  const url = config.server && new URL(config.server.connectUrl);
  const name = url ? getStudyNameFromUrl(url) : 'dev';
  return { ...config, name } as AppConfig;
}

/**
 * @param config The app config which might be missing 'survey_info'
 * @returns Shallow copy of the app config with the default 'survey_info' filled in if it was missing
 */
function _fillSurveyInfo(config: Partial<AppConfig>): AppConfig {
  if (config.survey_info) return config as AppConfig;
  return {
    ...config,
    survey_info: {
      surveys: {
        UserProfileSurvey: {
          formPath: 'json/demo-survey-v2.json',
          version: 1,
          compatibleWith: 1,
          dataKey: 'manual/demographic_survey',
          labelTemplate: {
            en: 'Answered',
            es: 'Contestada',
          },
        },
      },
      'trip-labels': 'MULTILABEL',
    },
  } as AppConfig;
}

/**
 * @description Fill in any fields that might be missing from the config ('name', 'survey_info') for
 *  backwards compatibility with old configs
 */
const _backwardsCompatFill = (config: Partial<AppConfig>): AppConfig =>
  _fillSurveyInfo(_fillStudyName(config));

export let _cacheResourcesFetchPromise: Promise<(string | undefined)[]> = Promise.resolve([]);
/**
 * @description Fetch and cache any surveys resources that are referenced by URL in the config,
 *   as well as the label_options config if it is present.
 *   This way they will be available when the user needs them, and we won't have to
 *   fetch them again unless local storage is cleared.
 * @param config The app config
 */
function cacheResourcesFromConfig(config: AppConfig) {
  const fetchPromises: Promise<string | undefined>[] = [];
  if (config.survey_info?.surveys) {
    Object.values(config.survey_info.surveys).forEach((survey) => {
      if (!survey?.['formPath']) throw new Error(i18next.t('config.survey-missing-formpath'));
      fetchPromises.push(fetchUrlCached(survey['formPath'], { cache: 'reload' }));
    });
  }
  if (config.label_options) {
    fetchPromises.push(fetchUrlCached(config.label_options, { cache: 'reload' }));
  }
  _cacheResourcesFetchPromise = Promise.all(fetchPromises);
}

/**
 * @description Fetch the config from the server, fill in any missing fields, and cache any
 *  resources referenced in the config
 * @param studyLabel The 'label' of the study, like 'open-access' or 'dev-emulator-study'
 * @returns The filled in app config
 */
async function readConfigFromServer(studyLabel: string) {
  const fetchedConfig = await fetchConfig(studyLabel);
  logDebug(`Successfully found config,
    fetchedConfig = ${JSON.stringify(fetchedConfig).substring(0, 10)}`);
  const filledConfig = _backwardsCompatFill(fetchedConfig);
  logDebug(`Applied backwards compat fills, 
    filledConfig = ${JSON.stringify(filledConfig).substring(0, 10)}`);

  // fetch + cache any resources referenced in the config, but don't 'await' them so we don't block
  // the config loading process
  cacheResourcesFromConfig(filledConfig);

  logDebug(`Successfully read config, returning config with 
    version = ${filledConfig.version}; 
    deployment_name = ${filledConfig.intro?.translated_text?.en?.deployment_name}; 
    connectionURL = ${fetchedConfig.server ? fetchedConfig.server.connectUrl : 'dev defaults'}`);
  return filledConfig;
}

/**
 * @description Fetch the config for a particular study, either from github, or if in dev mode, from
 *  localhost:9090 and github if that fails
 * @param studyLabel The 'label' of the study, like 'open-access' or 'dev-emulator-study'
 * @param alreadyTriedLocal Flag for dev environment, if true, will try to fetch from github
 * @returns The fetched app config
 */
async function fetchConfig(studyLabel: string, alreadyTriedLocal?: boolean) {
  logDebug('Received request to join ' + studyLabel);
  let downloadURL = `https://raw.githubusercontent.com/e-mission/nrel-openpath-deploy-configs/main/configs/${studyLabel}.nrel-op.json`;
  if (!__DEV__ || alreadyTriedLocal) {
    logDebug('Fetching config from github');
    const r = await fetch(downloadURL, { cache: 'reload' });
    if (!r.ok) throw new Error('Unable to fetch config from github');
    return r.json(); // TODO: validate, make sure it has required fields
  } else {
    logDebug('Running in dev environment, checking for locally hosted config');
    try {
      if (window['cordova'].platformId == 'android') {
        downloadURL = `http://10.0.2.2:9090/configs/${studyLabel}.nrel-op.json`;
      } else {
        downloadURL = `http://localhost:9090/configs/${studyLabel}.nrel-op.json`;
      }
      const r = await fetch(downloadURL, { cache: 'reload' });
      if (!r.ok) throw new Error('Local config not found');
      return r.json();
    } catch (err) {
      logDebug('Local config not found');
      return fetchConfig(studyLabel, true);
    }
  }
}

/**
 * @description Download and load a new config from the server if it is a different version
 * @param newToken The new token, which includes parts for the study label, subgroup, and user
 * @param existingVersion If the new config's version is the same, we won't update
 * @returns boolean representing whether the config was updated or not
 */
export function loadNewConfig(newToken: string, existingVersion?: number): Promise<boolean> {
  const newStudyLabel = getStudyNameFromToken(newToken);
  return readConfigFromServer(newStudyLabel)
    .then((downloadedConfig) => {
      if (downloadedConfig.version == existingVersion) {
        logDebug('UI_CONFIG: Not updating config because version is the same');
        return Promise.resolve(false);
      }
      // we want to validate before saving because we don't want to save
      // an invalid configuration
      const subgroup = getSubgroupFromToken(newToken, downloadedConfig);
      const toSaveConfig = {
        ...downloadedConfig,
        joined: { opcode: newToken, study_name: newStudyLabel, subgroup: subgroup },
      };
      const storeConfigPromise = window['cordova'].plugins.BEMUserCache.putRWDocument(
        CONFIG_PHONE_UI,
        toSaveConfig,
      );
      const storeInKVStorePromise = storageSet(CONFIG_PHONE_UI_KVSTORE, toSaveConfig);
      logDebug('UI_CONFIG: about to store ' + JSON.stringify(toSaveConfig));
      // loaded new config, so it is both ready and changed
      return Promise.all([storeConfigPromise, storeInKVStorePromise])
        .then(([result, kvStoreResult]) => {
          logDebug(`UI_CONFIG: Stored dynamic config in KVStore successfully, 
            result = ${JSON.stringify(kvStoreResult)}`);
          _promisedConfig = Promise.resolve(toSaveConfig);
          configChanged = true;
          return true;
        })
        .catch((storeError) => {
          displayError(storeError, i18next.t('config.unable-to-store-config'));
          return Promise.resolve(false);
        });
    })
    .catch((fetchErr) => {
      displayError(fetchErr, i18next.t('config.unable-download-config'));
      return Promise.resolve(false);
    });
}

// exported wrapper around loadNewConfig that includes error handling
export async function joinWithTokenOrUrl(tokenOrUrl: string) {
  try {
    const token = tokenOrUrl.includes('://') ? getTokenFromUrl(tokenOrUrl) : tokenOrUrl;
    try {
      return await loadNewConfig(token);
    } catch (err) {
      displayError(err, i18next.t('config.invalid-opcode-format'));
      return false;
    }
  } catch (err) {
    displayError(err, 'Error parsing token or URL: ' + tokenOrUrl);
    return false;
  }
}

/** @description Clears all local and native storage, then triggers a refresh */
export const resetDataAndRefresh = () =>
  storageClear({ local: true, native: true }).then(() => window.location.reload());

/**
 * @returns The app config, either from a cached copy, retrieved from local storage, or retrieved
 *   from user cache with getDocument()
 */
export function getConfig(): Promise<AppConfig | null> {
  if (_promisedConfig) return _promisedConfig;
  let promise = storageGet(CONFIG_PHONE_UI_KVSTORE).then((config) => {
    if (config && Object.keys(config).length) {
      logDebug('Got config from KVStore: ');
      return _backwardsCompatFill(config);
    }
    logDebug('No config found in KVStore, fetching from native storage');
    return window['cordova'].plugins.BEMUserCache.getDocument(CONFIG_PHONE_UI, false).then(
      (config) => {
        if (config && Object.keys(config).length) {
          logDebug('Got config from native storage: ' + JSON.stringify(config));
          return _backwardsCompatFill(config);
        }
        logWarn('No config found in native storage either. Returning null');
        return null;
      },
    );
  });
  _promisedConfig = promise;
  return promise;
}
