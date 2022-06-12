'use strict';

angular.module('emission.config.dynamic', ['emission.plugin.logger'])
.factory('DynamicConfig', function($http, Logger) {
    var dc = {};
    dc.initByUser = function(urlComponents) {
        const label = urlComponents.label;
        const source = urlComponents.source;
        Logger.log("Received request to switch to "+label+" from "+source);
        if (source != "github") {
            Logger.displayError("Invalid source", "Configurations from "+source+" not supported, please contact the app developer");
            return;
        };
        const downloadURL = "https://raw.githubusercontent.com/e-mission/nrel-openpath-deploy-configs/main/configs/"+label+".nrel-op.json"
        Logger.log("Downloading data from "+downloadURL);
        $http.get(downloadURL).then((result) => {
            Logger.log("Successfully found the "+downloadURL+", result is " + JSON.stringify(result.data).substring(0,10));
            return result.data;
        }).catch((err) => {
            Logger.displayError("Unable to download study config", err);
        });
    };
    return dc;
});
