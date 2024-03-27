import i18next from 'i18next';
import { displayError, logDebug, logWarn } from '../plugin/logger';
import { fetchUrlCached } from '../services/commHelper';
import { storageClear, storageGet, storageSet } from '../plugin/storage';
import { AppConfig } from '../types/appConfigTypes';

export const CONFIG_PHONE_UI = 'config/app_ui_config';
export const CONFIG_PHONE_UI_KVSTORE = 'CONFIG_PHONE_UI';

export let storedConfig: AppConfig | null = null;
export let configChanged = false;
export const setConfigChanged = (b) => (configChanged = b);

// used to test multiple configs, not used outside of test
export const _test_resetStoredConfig = () => {
  storedConfig = null;
};

/**
 * @param connectUrl The URL endpoint specified in the config
 * @returns The study name (like 'stage' or whatever precedes 'openpath' in the URL),
 *   or undefined if it can't be determined
 */
function _getStudyName(connectUrl: `https://${string}`) {
  const orig_host = new URL(connectUrl).hostname;
  const first_domain = orig_host.split('.')[0];
  if (first_domain == 'openpath-stage') {
    return 'stage';
  }
  const openpath_index = first_domain.search('-openpath');
  if (openpath_index == -1) {
    return undefined;
  }
  const study_name = first_domain.substr(0, openpath_index);
  return study_name;
}

/**
 * @param config The app config which might be missing 'name'
 * @returns Shallow copy of the app config with 'name' filled in if it was missing
 */
function _fillStudyName(config: Partial<AppConfig>): AppConfig {
  if (config.name) return config as AppConfig;
  if (config.server) {
    return { ...config, name: _getStudyName(config.server.connectUrl) } as AppConfig;
  } else {
    return { ...config, name: 'dev' } as AppConfig;
  }
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

/**
 * @description Fetch and cache any surveys resources that are referenced by URL in the config,
 *   as well as the label_options config if it is present.
 *   This way they will be available when the user needs them, and we won't have to
 *   fetch them again unless local storage is cleared.
 * @param config The app config
 */
function cacheResourcesFromConfig(config: AppConfig) {
  if (config.survey_info?.surveys) {
    Object.values(config.survey_info.surveys).forEach((survey) => {
      if (!survey?.['formPath']) throw new Error(i18next.t('config.survey-missing-formpath'));
      fetchUrlCached(survey['formPath']);
    });
  }
  if (config.label_options) {
    fetchUrlCached(config.label_options);
  }
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
  const downloadURL = `https://raw.githubusercontent.com/e-mission/nrel-openpath-deploy-configs/main/configs/${studyLabel}.nrel-op.json`;
  if (!__DEV__ || alreadyTriedLocal) {
    logDebug('Fetching config from github');
    const r = await fetch(downloadURL);
    if (!r.ok) throw new Error('Unable to fetch config from github');
    return r.json(); // TODO: validate, make sure it has required fields
  } else {
    logDebug('Running in dev environment, checking for locally hosted config');
    try {
      const r = await fetch('http://localhost:9090/configs/' + studyLabel + '.nrel-op.json');
      if (!r.ok) throw new Error('Local config not found');
      return r.json();
    } catch (err) {
      logDebug('Local config not found');
      return fetchConfig(studyLabel, true);
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
function extractStudyName(token: string): string {
  const tokenParts = token.split('_');
  if (tokenParts.length < 3 || tokenParts.some((part) => part == '')) {
    // all tokens must have at least nrelop_[studyname]_[usercode]
    // and neither [studyname] nor [usercode] can be blank
    throw new Error(i18next.t('config.not-enough-parts-old-style', { token: token }));
  }
  if (tokenParts[0] != 'nrelop') {
    throw new Error(i18next.t('config.no-nrelop-start', { token: token }));
  }
  return tokenParts[1];
}

function extractSubgroup(token: string, config: AppConfig): string | undefined {
  if (config.opcode) {
    // new style study, expects token with sub-group
    const tokenParts = token.split('_');
    if (tokenParts.length <= 3) {
      // no subpart defined
      throw new Error(i18next.t('config.not-enough-parts', { token: token }));
    }
    if (config.opcode.subgroups) {
      if (config.opcode.subgroups.indexOf(tokenParts[2]) == -1) {
        // subpart not in config list
        throw new Error(
          i18next.t('config.invalid-subgroup', {
            token: token,
            subgroup: tokenParts[2],
            config_subgroups: config.opcode.subgroups,
          }),
        );
      } else {
        logDebug('subgroup ' + tokenParts[2] + ' found in list ' + config.opcode.subgroups);
        return tokenParts[2];
      }
    } else {
      if (tokenParts[2] != 'default') {
        // subpart not in config list
        throw new Error(i18next.t('config.invalid-subgroup-no-default', { token: token }));
      } else {
        logDebug("no subgroups in config, 'default' subgroup found in token ");
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
    logDebug('Old-style study, expecting token without a subgroup...');
    return undefined;
  }
}

/**
 * @description Download and load a new config from the server if it is a different version
 * @param newToken The new token, which includes parts for the study label, subgroup, and user
 * @param existingVersion If the new config's version is the same, we won't update
 * @returns boolean representing whether the config was updated or not
 */
function loadNewConfig(newToken: string, existingVersion?: number): Promise<boolean> {
  const newStudyLabel = extractStudyName(newToken);
  return readConfigFromServer(newStudyLabel)
    .then((downloadedConfig) => {
      if (downloadedConfig.version == existingVersion) {
        logDebug('UI_CONFIG: Not updating config because version is the same');
        return Promise.resolve(false);
      }
      // we want to validate before saving because we don't want to save
      // an invalid configuration
      const subgroup = extractSubgroup(newToken, downloadedConfig);
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
          storedConfig = toSaveConfig;
          configChanged = true;
          return true;
        })
        .catch((storeError) => {
          displayError(storeError, i18next.t('config.unable-to-store-config'));
          return Promise.reject(storeError);
        });
    })
    .catch((fetchErr) => {
      displayError(fetchErr, i18next.t('config.unable-download-config'));
      return Promise.reject(fetchErr);
    });
}

// exported wrapper around loadNewConfig that includes error handling
export function initByUser(urlComponents: { token: string }) {
  const { token } = urlComponents;
  try {
    return loadNewConfig(token).catch((fetchErr) => {
      displayError(fetchErr, i18next.t('config.unable-download-config'));
      return Promise.reject(fetchErr);
    });
  } catch (error) {
    displayError(error, i18next.t('config.invalid-opcode-format'));
    return Promise.reject(error);
  }
}

/** @description Clears all local and native storage, then triggers a refresh */
export const resetDataAndRefresh = () =>
  storageClear({ local: true, native: true }).then(() => window.location.reload());

/**
 * @returns The app config, either from a cached copy, retrieved from local storage, or retrieved
 *   from user cache with getDocument()
 */
export function getConfig(): Promise<AppConfig> {
  if (storedConfig) return Promise.resolve(storedConfig);
  return storageGet(CONFIG_PHONE_UI_KVSTORE).then((config) => {
    if (config && Object.keys(config).length) {
      logDebug('Got config from KVStore: ' + JSON.stringify(config));
      storedConfig = _backwardsCompatFill(config);
      return storedConfig;
    }
    logDebug('No config found in KVStore, fetching from native storage');
    return window['cordova'].plugins.BEMUserCache.getDocument(CONFIG_PHONE_UI, false).then(
      (config) => {
        if (config && Object.keys(config).length) {
          logDebug('Got config from native storage: ' + JSON.stringify(config));
          storedConfig = _backwardsCompatFill(config);
          return storedConfig;
        }
        logWarn('No config found in native storage either. Returning null');
        return null;
      },
    );
  });
}
