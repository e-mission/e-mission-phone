import angular from 'angular';

angular.module('emission.plugin.logger', [])

// explicit annotations needed in .ts files - Babel does not fix them (see webpack.prod.js)
.factory('Logger', ['$window', '$ionicPopup', function($window, $ionicPopup) {
    var loggerJs: any = {};
    loggerJs.log = function(message) {
        $window.Logger.log($window.Logger.LEVEL_DEBUG, message);
    }
    loggerJs.displayError = function(title, error) {
      var display_msg = error.message + "\n" + error.stack;
      if (!angular.isDefined(error.message)) {
        display_msg = JSON.stringify(error);
      }
      // Check for OPcode DNE errors and prepend the title with "Invalid OPcode"
      if (error.includes?.("403") || error.message?.includes?.("403")) {
        title = "Invalid OPcode: " + title;
      }
      $ionicPopup.alert({"title": title, "template": display_msg});
      console.log(title + display_msg);
      $window.Logger.log($window.Logger.LEVEL_ERROR, title + display_msg);
    }
    return loggerJs;
}]);

export const logDebug = (message: string) =>
  window['Logger'].log(window['Logger'].LEVEL_DEBUG, message);

export const logInfo = (message: string) =>
  window['Logger'].log(window['Logger'].LEVEL_INFO, message);

export const logWarn = (message: string) =>
  window['Logger'].log(window['Logger'].LEVEL_WARN, message);

export function displayError(error: Error, title?: string) {
  const errorMsg = error.message ? error.message + '\n' + error.stack : JSON.stringify(error);
  displayErrorMsg(errorMsg, title);
}

export function displayErrorMsg(errorMsg: string, title?: string) {
  // Check for OPcode 'Does Not Exist' errors and prepend the title with "Invalid OPcode"
  if (errorMsg.includes?.("403")) {
    title = "Invalid OPcode: " + (title || '');
  }
  const displayMsg = `━━━━\n${title}\n━━━━\n` + errorMsg;
  window.alert(displayMsg);
  console.error(displayMsg);
  window['Logger']?.log(window['Logger'].LEVEL_ERROR, displayMsg);
}
