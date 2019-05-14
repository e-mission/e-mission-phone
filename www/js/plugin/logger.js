angular.module('emission.plugin.logger', [])

.factory('Logger', function($window, $ionicPopup) {
    var loggerJs = {}
    loggerJs.log = function(message) {
        $window.Logger.log($window.Logger.LEVEL_DEBUG, message);
    }
    loggerJs.displayError = function(title, error) {
      var display_msg = error.message + "\n" + error.stack;
      if (!angular.isDefined(error.message)) {
        display_msg = JSON.stringify(error);
      }
      $ionicPopup.alert({"title": title, "template": display_msg});
      console.log(title + display_msg);
      $window.Logger.log($window.Logger.LEVEL_ERROR, title + display_msg);
    }
    return loggerJs;
});
