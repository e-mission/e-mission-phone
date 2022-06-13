'use strict';

angular.module('emission.config.server_conn', ['emission.plugin.logger'])
.factory('ServerConnConfig', function($rootScope) {
    var scc = {}

    scc.init = function(connectionConfig) {
        if (connectionConfig) {
            Logger.log("connectionConfig = "+JSON.stringify(connectionConfig));
            $rootScope.connectUrl = connectionConfig.connectUrl;
            $rootScope.aggregateAuth = connectionConfig.aggregate_call_auth;
            window.cordova.plugins.BEMConnectionSettings.setSettings(connectionConfig);
        } else {
            // not displaying the error here since we have a backup
            Logger.log("connectionConfig not defined, reverting to defaults");
            window.cordova.plugins.BEMConnectionSettings.getDefaultSettings().then(function(defaultConfig) {
                Logger.log("defaultConfig = "+JSON.stringify(defaultConfig));
                $rootScope.connectUrl = defaultConfig.connectUrl;
                $rootScope.aggregateAuth = "no_auth";
                window.cordova.plugins.BEMConnectionSettings.setSettings(defaultConfig);
            });
        };
    };

    console.log("Registering for the UI_CONFIG_READY notification");
    $rootScope.$on("UI_CONFIG_READY", function(event, newConfig) {
      Logger.log("Received UI_CONFIG_READY notification in intro.js, filling in templates");
      scc.init(newConfig.server);
    });
    return scc;
});
