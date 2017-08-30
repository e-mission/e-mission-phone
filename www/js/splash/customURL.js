'use strict';

angular.module('emission.splash.customURLScheme', [])

.factory('CustomURLScheme', function($rootScope) {
    var cus = {};

    var parseURL = function(url) {
        var addr = url.split('//')[1];
        var route = addr.split('?')[0];
        var params = addr.split('?')[1];
        var paramsList = params.split('&');
        var rtn = {route: route};
        for (var i = 0; i < paramsList.length; i++) {
          var splitList = paramsList[i].split('=');
          rtn[splitList[0]] = splitList[1];
        }
        return rtn;
    };

    /*
     * Register a custom URL handler.
     * handler arguments are:
     *
     *  event: 
     *  url: the url that was passed in
     *  urlComponents: the URL parsed into multiple components
     */
    cus.onLaunch = function(handler) {
        console.log("onLaunch method from factory called");
        $rootScope.$on("CUSTOM_URL_LAUNCH", function(event, url) {
            var urlComponents = parseURL(url);
            handler(event, url, urlComponents);
        });
    };

    return cus;
});

function handleOpenURL(url) {
    console.log("onLaunch method from external function called");
    var c = document.querySelectorAll("[ng-app]")[0];
    var scope = angular.element(c).scope();
    scope.$broadcast("CUSTOM_URL_LAUNCH", url);
};

