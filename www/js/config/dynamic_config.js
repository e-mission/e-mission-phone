'use strict';

import angular from 'angular';
import { displayError, logDebug } from '../plugin/logger';
import i18next from 'i18next';
import { fetchUrlCached } from '../commHelper';

angular.module('emission.config.dynamic', ['emission.plugin.logger',
    'emission.plugin.kvstore'])
.factory('DynamicConfig', function($http, $ionicPlatform,
        $window, $state, $rootScope, $timeout, KVStore, Logger) {
    // also used in the startprefs class
    // but without importing this
    const CONFIG_PHONE_UI="config/app_ui_config";
    const CONFIG_PHONE_UI_KVSTORE ="CONFIG_PHONE_UI";
    const LOAD_TIMEOUT = 6000; // 6000 ms = 6 seconds

    var dc = {};
    dc.UI_CONFIG_READY="UI_CONFIG_READY";
    dc.UI_CONFIG_CHANGED="UI_CONFIG_CHANGED";
    dc.isConfigReady = false;
    dc.isConfigChanged = false;

    dc.configChanged = function() {
        if (dc.isConfigChanged) {
            return Promise.resolve(dc.config);
        } else {
            return new Promise(function(resolve, reject) {
                $rootScope.$on(dc.UI_CONFIG_CHANGED, (event, newConfig) => resolve(newConfig));
            });
        }
    }
    dc.configReady = function() {
        if (dc.isConfigReady) {
            Logger.log("UI_CONFIG in configReady function, resolving immediately");
            return Promise.resolve(dc.config);
        } else {
            Logger.log("UI_CONFIG in configReady function, about to create promise");
            return new Promise(function(resolve, reject) {
                Logger.log("Registering for UI_CONFIG_READY notification in dynamic_config inside the promise");
                $rootScope.$on(dc.UI_CONFIG_READY, (event, newConfig) => {
                    Logger.log("Received UI_CONFIG_READY notification in dynamic_config, resolving promise");
                    resolve(newConfig)
                });
            });
        }
    }

    /* Fetch and cache any surveys resources that are referenced by URL in the config,
      as well as the label_options config if it is present.
      This way they will be available when the user needs them, and we won't have to
      fetch them again unless local storage is cleared. */
    const cacheResourcesFromConfig = (config) => {
      if (config.survey_info?.surveys) {
        Object.values(config.survey_info.surveys).forEach((survey) => {
          if (!survey?.formPath)
            throw new Error(i18next.t('config.survey-missing-formpath'));
          fetchUrlCached(survey.formPath);
        });
      }
      if (config.label_options) {
        fetchUrlCached(config.label_options);
      }
    }

    const readConfigFromServer = async (label) => {
      const config = await fetchConfig(label);
      Logger.log("Successfully found config, result is " + JSON.stringify(config).substring(0, 10));

      // fetch + cache any resources referenced in the config, but don't 'await' them so we don't block
      // the config loading process
      cacheResourcesFromConfig(config);

      const connectionURL = config.server ? config.server.connectUrl : "dev defaults";
      _fillStudyName(config);
      _backwardsCompatSurveyFill(config);
      Logger.log("Successfully downloaded config with version " + config.version
        + " for " + config.intro.translated_text.en.deployment_name
        + " and data collection URL " + connectionURL);
      return config;
    }

    const fetchConfig = async (label, alreadyTriedLocal=false) => {
        Logger.log("Received request to join "+label);
        const downloadURL = `https://raw.githubusercontent.com/e-mission/nrel-openpath-deploy-configs/main/configs/${label}.nrel-op.json`;
        if (!__DEV__ || alreadyTriedLocal) {
            Logger.log("Fetching config from github");
            const r = await fetch(downloadURL);
            if (!r.ok) throw new Error('Unable to fetch config from github');
            return r.json();
        }
        else {
            Logger.log("Running in dev environment, checking for locally hosted config");
            try {
                const r = await fetch('http://localhost:9090/configs/'+label+'.nrel-op.json');
                if (!r.ok) throw new Error('Local config not found');
                return r.json();
            } catch (err) {
                Logger.log("Local config not found");
                return fetchConfig(label, true);
            }
        }
    }

    dc.loadSavedConfig = function() {
        const nativePlugin = $window.cordova.plugins.BEMUserCache;
        const rwDocRead = nativePlugin.getDocument(CONFIG_PHONE_UI, false);
        const kvDocRead = KVStore.get(CONFIG_PHONE_UI_KVSTORE);
        return Promise.all([rwDocRead, kvDocRead])
            .then(([rwConfig, kvStoreConfig]) => {
                const savedConfig = kvStoreConfig? kvStoreConfig : rwConfig;
                Logger.log("DYNAMIC CONFIG: kvStoreConfig key length = "+ Object.keys(kvStoreConfig || {}).length
                    +" rwConfig key length = "+ Object.keys(rwConfig || {}).length
                    +" using kvStoreConfig? "+(kvStoreConfig? true: false));
                if (!kvStoreConfig && rwConfig) {
                    // Backwards compat, can remove at the end of 2023
                    Logger.log("DYNAMIC CONFIG: rwConfig found, kvStoreConfig not found, setting to fix backwards compat");
                    KVStore.set(CONFIG_PHONE_UI_KVSTORE, rwConfig);
                }
                if ((Object.keys(kvStoreConfig || {}).length > 0)
                    && (Object.keys(rwConfig || {}).length == 0)) {
                    // Might as well sync the RW config if it doesn't exist and
                    // have triple-redundancy for this
                    nativePlugin.putRWDocument(CONFIG_PHONE_UI, kvStoreConfig);
                }
                Logger.log("DYNAMIC CONFIG: final selected config = "+JSON.stringify(savedConfig));
                if (nativePlugin.isEmptyDoc(savedConfig)) {
                    Logger.log("Found empty saved ui config, returning null");
                    return undefined;
                } else {
                    Logger.log("Found previously stored ui config, returning it");
                    _fillStudyName(savedConfig);
                    _backwardsCompatSurveyFill(savedConfig);
                    return savedConfig;
                }
            })
            .catch((err) => Logger.displayError(i18next.t('config.unable-read-saved-config'), err));
    }

    dc.resetConfigAndRefresh = function() {
        const resetNativePromise = $window.cordova.plugins.BEMUserCache.putRWDocument(CONFIG_PHONE_UI, {});
        const resetKVStorePromise = KVStore.set(CONFIG_PHONE_UI_KVSTORE, {});
        Promise.all([resetNativePromise, resetKVStorePromise])
            .then($window.location.reload(true));
    }

    /**
     * loadNewConfig download and load a new config from the server if it is a differ
     * @param {[]} urlComponents specify the label of the config to load
     * @param {} thenGoToIntro whether to go to the intro screen after loading the config
     * @param {} [existingVersion=null] if the new config's version is the same, we won't update
     * @returns {boolean} boolean representing whether the config was updated or not
     */
    var loadNewConfig = function (newStudyLabel, thenGoToIntro, existingVersion=null) {
        return readConfigFromServer(newStudyLabel).then((downloadedConfig) => {
            if (downloadedConfig.version == existingVersion) {
                Logger.log("UI_CONFIG: Not updating config because version is the same");
                return Promise.resolve(false);
            }
            // we want to validate before saving because we don't want to save
            // an invalid configuration
            const subgroup = dc.extractSubgroup(dc.scannedToken, downloadedConfig);
            // we can use angular.extend since urlComponents is not nested
            // need to change this to angular.merge if that changes
            const toSaveConfig = angular.extend(downloadedConfig,
                {joined: {opcode: dc.scannedToken, study_name: newStudyLabel, subgroup: subgroup}});
            const storeConfigPromise = $window.cordova.plugins.BEMUserCache.putRWDocument(
                CONFIG_PHONE_UI, toSaveConfig);
            const storeInKVStorePromise = KVStore.set(CONFIG_PHONE_UI_KVSTORE, toSaveConfig);
            const logSuccess = (storeResults) => Logger.log("UI_CONFIG: Stored dynamic config successfully, result = "+JSON.stringify(storeResults));
            // loaded new config, so it is both ready and changed
            return Promise.all([storeConfigPromise, storeInKVStorePromise]).then(
            ([result, kvStoreResult]) => {
                logSuccess(result);
                dc.saveAndNotifyConfigChanged(downloadedConfig);
                dc.saveAndNotifyConfigReady(downloadedConfig);
                if (thenGoToIntro)
                    $state.go("root.intro");
                return true;
            }).catch((storeError) =>
                Logger.displayError(i18next.t('config.unable-to-store-config'), storeError));
        }).catch((fetchErr) => {
            displayError(fetchErr, i18next.t('config.unable-download-config'));
        });
    }

    dc.saveAndNotifyConfigReady = function(newConfig) {
        dc.config = newConfig;
        dc.isConfigReady = true;
        console.log("Broadcasting event "+dc.UI_CONFIG_READY);
        $rootScope.$broadcast(dc.UI_CONFIG_READY, newConfig);
    }

    dc.saveAndNotifyConfigChanged = function(newConfig) {
        dc.config = newConfig;
        dc.isConfigChanged = true;
        console.log("Broadcasting event "+dc.UI_CONFIG_CHANGED);
        $rootScope.$broadcast(dc.UI_CONFIG_CHANGED, newConfig);
    }

    const _getStudyName = function(connectUrl) {
        const orig_host = new URL(connectUrl).hostname;
        const first_domain = orig_host.split(".")[0];
        if (first_domain == "openpath-stage") { return "stage"; }
        const openpath_index = first_domain.search("-openpath");
        if (openpath_index == -1) { return undefined; }
        const study_name = first_domain.substr(0,openpath_index);
        return study_name;
    }

    const _fillStudyName = function(config) {
        if (!config.name) {
            if (config.server) {
                config.name = _getStudyName(config.server.connectUrl);
            } else {
                config.name = "dev";
            }
        }
    }

    const _backwardsCompatSurveyFill = function(config) {
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
    dc.extractStudyName = function(token) {
        const tokenParts = token.split("_");
        if (tokenParts.length < 3) {
          // all tokens must have at least nrelop_[study name]_...
          throw new Error(i18next.t('config.not-enough-parts-old-style', {"token": token}));
        }
        if (tokenParts[0] != "nrelop") {
          throw new Error(i18next.t('config.no-nrelop-start', {token: token}));
        }
        return tokenParts[1];
    }

    dc.extractSubgroup = function(token, config) {
        if (config.opcode) {
            // new style study, expects token with sub-group
            const tokenParts = token.split("_");
            if (tokenParts.length <= 3) { // no subpart defined
                throw new Error(i18next.t('config.not-enough-parts', {token: token}));
            }
            if (config.opcode.subgroups) {
                if (config.opcode.subgroups.indexOf(tokenParts[2]) == -1) {
                // subpart not in config list
                    throw new Error(i18next.t('config.invalid-subgroup', {token: token, subgroup: tokenParts[2], config_subgroups: config.opcode.subgroups}));
                } else {
                    console.log("subgroup "+tokenParts[2]+" found in list "+config.opcode.subgroups);
                    return tokenParts[2];
                }
            } else {
                if (tokenParts[2] != "default") {
                    // subpart not in config list
                    throw new Error(i18next.t('config.invalid-subgroup-no-default', {token: token}));
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



    dc.initByUser = function(urlComponents) {
        dc.scannedToken = urlComponents.token;
        try {
            const newStudyLabel = dc.extractStudyName(dc.scannedToken);
            return loadNewConfig(newStudyLabel, true)
                // on successful download, cache the token in the rootScope
                .then((wasUpdated) => {$rootScope.scannedToken = dc.scannedToken})
                .catch((fetchErr) => {
                    Logger.displayError(i18next.t('config.unable-download-config'), fetchErr);
                });
        } catch (error) {
            Logger.displayError(i18next.t('config.invalid-opcode-format'), error);
            return Promise.reject(error);
        }
    };
    dc.initAtLaunch = function () {
        dc.loadSavedConfig().then((existingConfig) => {
            if (!existingConfig) {
                return Logger.log("UI_CONFIG: No existing config, skipping");
            }
            // if 'autoRefresh' is set, we will check for updates
            if (existingConfig.autoRefresh) {
                loadNewConfig(existingConfig.joined.study_name, false, existingConfig.version)
                    .then((wasUpdated) => {
                        if (!wasUpdated) {
                            // config was not updated so we will proceed with existing config
                            $rootScope.$evalAsync(() => dc.saveAndNotifyConfigReady(existingConfig));
                        }
                    }).catch((fetchErr) => {
                        // if we can't check for an updated config, we will proceed with the existing config
                        Logger.log("UI_CONFIG: Unable to check for update, skipping", fetchErr);
                        $rootScope.$evalAsync(() => dc.saveAndNotifyConfigReady(existingConfig));
                    });
            } else {
                Logger.log("UI_CONFIG: autoRefresh is false, not checking for updates. Using existing config")
                $rootScope.$apply(() => dc.saveAndNotifyConfigReady(existingConfig));
            }
        }).catch((err) => {
            Logger.displayError(i18next.t('config.error-loading-config-app-start', err))
        });
    };
    $ionicPlatform.ready().then(function() {
        dc.initAtLaunch();
    });
    return dc;
});
