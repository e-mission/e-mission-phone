'use strict';

angular.module('emission.config.dynamic', ['emission.plugin.logger'])
.factory('DynamicConfig', function($http, $ionicPlatform,
        $window, $state, $rootScope, $timeout, Logger) {
    // also used in the startprefs class
    // but without importing this
    const CONFIG_PHONE_UI="config/app_ui_config";
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

    var readConfigFromServer = function(label) {
        Logger.log("Received request to join "+label);
        // The URL prefix from which config files will be downloaded and read.
        // Change this if you supply your own config files. TODO: on merge, change this from sebastianbarry's branch to the master e-mission branch
        const downloadURL = "https://raw.githubusercontent.com/e-mission/nrel-openpath-deploy-configs/main/configs/"+label+".nrel-op.json"
        Logger.log("Downloading data from "+downloadURL);
        return $http.get(downloadURL).then((result) => {
            Logger.log("Successfully found the "+downloadURL+", result is " + JSON.stringify(result.data).substring(0,10));
            const parsedConfig = result.data;
            const connectionURL = parsedConfig.server? parsedConfig.server.connectUrl : "dev defaults";
            _fillStudyName(parsedConfig);
            _backwardsCompatSurveyFill(parsedConfig);
            Logger.log("Successfully downloaded config with version "+parsedConfig.version
                +" for "+parsedConfig.intro.translated_text.en.deployment_name
                +" and data collection URL "+connectionURL);
            return parsedConfig;
        });
    }

    var loadSavedConfig = function() {
        const nativePlugin = $window.cordova.plugins.BEMUserCache;
        return nativePlugin.getDocument(CONFIG_PHONE_UI, false)
            .then((savedConfig) => {
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
            .catch((err) => Logger.displayError("Unable to read saved config", err));
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
            // a downloaded configuration
            if (!dc.validateToken(dc.scannedToken, downloadedConfig)) {
                Logger.log("UI_CONFIG: unable to validate token "+dc.scannedToken+" against config ", downloadedConfig.opcode);
                return Promise.resolve(false);
            }
            // we can use angular.extend since urlComponents is not nested
            // need to change this to angular.merge if that changes
            const toSaveConfig = angular.extend(downloadedConfig, {joined: dc.scannedToken});
            const storeConfigPromise = $window.cordova.plugins.BEMUserCache.putRWDocument(
                CONFIG_PHONE_UI, toSaveConfig);
            const logSuccess = (storeResults) => Logger.log("UI_CONFIG: Stored dynamic config successfully, result = "+JSON.stringify(storeResults));
            // loaded new config, so it is both ready and changed
            return storeConfigPromise.then(logSuccess)
                .then(dc.saveAndNotifyConfigChanged(downloadedConfig))
                .then(dc.saveAndNotifyConfigReady(downloadedConfig))
                .then(() => {
                    if (thenGoToIntro) $state.go("root.intro")
                })
                .then(() => true)
                .catch((storeError) => Logger.displayError("Error storing downloaded study configuration", storeError));
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
     * So let's support two separate functions here - extractStudyName and validateToken
     */
    dc.extractStudyName = function(token) {
        const tokenParts = token.split("_");
        if (tokenParts.length < 3) {
          // all tokens must have at least nrelop_[study name]_...
          throw new Error("token "+token+" does not have at least two '_' characters");
        }
        if (tokenParts[0] != "nrelop") {
          throw new Error("token "+token+" does not start with 'nrelop', please re-check");
        }
        return tokenParts[1];
    }

    dc.validateToken = function(token, config) {
        if (config.opcode) {
            // new style study, expects token with sub-group
            const tokenParts = token.split("_");
            if (tokenParts.length <= 3) { // no subpart defined
                throw new Error("Invalid opcode format, expected 'nrelop_study_subgroup_[random string]");
            }
            if (config.opcode.subgroups) {
                if (config.opcode.subgroups.indexOf(tokenParts[2]) == -1) {
                // subpart not in config list
                    throw new Error("Invalid opcode, subgroup '"+tokenParts[2]+"' not found in list '"+config.opcode.subgroups+"'");
                } else {
                    console.log("subgroup "+tokenParts[2]+" found in list");
                    return true;
                }
            } else {
                if (tokenParts[2] != "default") {
                    // subpart not in config list
                    throw new Error("Invalid opcode, no subgroups, expected 'default' subgroup");
                } else {
                    console.log("no subgroups in config, 'default' subgroup found in token ");
                    return true;
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
            return true;
        }
    }



    dc.initByUser = function(urlComponents) {
        dc.scannedToken = urlComponents.token;
        loadSavedConfig().then((savedConfig) => {
            if(savedConfig && angular.equals(savedConfig.joined, urlComponents)) {
                Logger.log("UI_CONFIG: existing label " + JSON.stringify(savedConfig.label) +
                    " and new one " + JSON.stringify(urlComponents), " are the same, skipping download");
                // use dc.$apply here to be consistent with $http so we can consistently
                // skip it in the listeners
                // only loaded existing config, so it is ready, but not changed
                $rootScope.$apply(() => dc.saveAndNotifyConfigReady);
                return; // labels are the same
            }
            // if the labels are different, we need to download the new config
            try {
                const newStudyLabel = dc.extractStudyName(dc.scannedToken);
                return loadNewConfig(newStudyLabel, true)
                    // on successful download, cache the token in the rootScope
                    .then((wasUpdated) => {$rootScope.scannedToken = dc.scannedToken})
                    .catch((fetchErr) => {
                        Logger.displayError("Unable to download study config", fetchErr);
                    });
            } catch (error) {
                Logger.displayError("Invalid token format", error);
                return Promise.reject(error);
            }
        });
    };
    dc.initAtLaunch = function () {
        loadSavedConfig().then((existingConfig) => {
            if (!existingConfig) {
                return Logger.log("UI_CONFIG: No existing config, skipping");
            }
            // if 'autoRefresh' is set, we will check for updates
            if (existingConfig.autoRefresh) {
                loadNewConfig(existingConfig.joined, false, existingConfig.version)
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
            Logger.displayError("Error loading config on app start", err)
        });
    };
    $ionicPlatform.ready().then(function() {
        dc.initAtLaunch();
    });
    return dc;
});
