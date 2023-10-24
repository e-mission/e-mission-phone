'use strict';

import angular from 'angular';

angular.module('emission.config.server_conn',
    ['emission.plugin.logger', 'emission.config.dynamic'])
.factory('ServerConnConfig', function($rootScope, DynamicConfig, $ionicPlatform) {
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

    console.log("Registering for the UI_CONFIG_CHANGED notification in the server connection");
    $ionicPlatform.ready().then(function() {
      DynamicConfig.configChanged().then((newConfig) => {
        Logger.log("Resolved UI_CONFIG_CHANGED promise in server_conn.js, filling in URL");
        scc.init(newConfig.server);
      });
    });
    return scc;
});
