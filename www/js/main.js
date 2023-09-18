'use strict';

import angular from 'angular';
import App from './app';

angular.module('emission.main', ['emission.main.diary',
                                 'emission.main.control',
                                 'emission.main.metrics.factory',
                                 'emission.main.metrics.mappings',
                                 'emission.config.dynamic',
                                 'emission.services',
                                 'emission.services.upload',
                                  App.module])

.config(function($stateProvider) {
  $stateProvider.state('root.main', {
    url: '/main',
    template: `<app class="fill-container"></app>`
  });
})

.controller('appCtrl', function($scope, $ionicModal, $timeout) {
    $scope.openNativeSettings = function() {
        window.Logger.log(window.Logger.LEVEL_DEBUG, "about to open native settings");
        window.cordova.plugins.BEMLaunchNative.launch("NativeSettings", function(result) {
            window.Logger.log(window.Logger.LEVEL_DEBUG,
                "Successfully opened screen NativeSettings, result is "+result);
        }, function(err) {
            window.Logger.log(window.Logger.LEVEL_ERROR,
                "Unable to open screen NativeSettings because of err "+err);
        });
    }
});
