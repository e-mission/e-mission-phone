'use strict';

angular.module('customURLScheme', [])

.factory('CustomURLScheme', function($rootScope) {
    return {
        onLaunch: function(handler){
            $rootScope.$on("CUSTOM_URL_LAUNCH", handler);
        }
    }
});

function handleOpenURL(url) {
    var c = document.querySelectorAll("[ng-app]")[0];
    var scope = angular.element(c).scope();
    scope.$broadcast("CUSTOM_URL_LAUNCH", url);
};
