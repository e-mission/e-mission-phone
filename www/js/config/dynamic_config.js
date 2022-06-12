'use strict';

angular.module('emission.config.dynamic', ['emission.plugin.logger', 'emission.plugin.kvstore'])
.factory('DynamicConfig', function($http, $window, KVStore, Logger) {
    const STUDY_LABEL="DYNAMIC_UI_STUDY";
    const CONFIG_PHONE_UI="config/phone_ui_config";
    var dc = {};
    var readConfigFromServer = function(label, source) {
        Logger.log("Received request to switch to "+label+" from "+source);
        if (source != "github") {
            Logger.displayError("Invalid source", "Configurations from "+source+" not supported, please contact the app developer");
            return;
        };
        const downloadURL = "https://raw.githubusercontent.com/e-mission/nrel-openpath-deploy-configs/main/configs/"+label+".nrel-op.json"
        Logger.log("Downloading data from "+downloadURL);
        return $http.get(downloadURL).then((result) => {
            Logger.log("Successfully found the "+downloadURL+", result is " + JSON.stringify(result.data).substring(0,10));
            const parsedConfig = result.data;
            Logger.log("Successfully downloaded config with version "+parsedConfig.version
                +" for "+parsedConfig.intro.translated_text.en.deployment_name
                +" and data collection URL"+parsedConfig.server.url );
            return parsedConfig;
        }).catch((fetchErr) => {
            Logger.displayError("Unable to download study config", fetchErr);
        });
    }
    dc.initByUser = function(urlComponents) {
        const newStudyLabel = urlComponents.label;
        KVStore.get(STUDY_LABEL).then((existingStudyLabel) => {
            if(angular.equals(existingStudyLabel, urlComponents)) {
                Logger.log("existing label " + JSON.stringify(existingStudyLabel) +
                    " and new one " + JSON.stringify(urlComponents), " are the same, skipping");
                return; // labels are the same
            }
            // if the labels are different
            return readConfigFromServer(urlComponents.label, urlComponents.source).then((downloadedConfig) => {
                const storeLabelPromise = KVStore.set(STUDY_LABEL, urlComponents);
                const storeConfigPromise = $window.cordova.plugins.BEMUserCache.putRWDocument(
                    CONFIG_PHONE_UI, downloadedConfig);
                return Promise.all([storeLabelPromise, storeConfigPromise])
                .then((storeResults) => Logger.log("Stored dynamic config successfully, result = "+JSON.stringify(storeResults)))
                .catch((storeError) => Logger.displayError("Error storing study configuration", storeError));
            });
        });
    };
    return dc;
});
