angular.module('emission.plugin.logger', [])

.factory('Logger', function($window, $state, $interval, $rootScope) {
    var loggerJs = {}
    loggerJs.log = function(message) {
        $window.Logger.log($window.Logger.LEVEL_DEBUG, message);
    }
    return loggerJs;
});
