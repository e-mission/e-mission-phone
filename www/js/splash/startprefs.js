angular.module('emission.splash.startprefs', [])

.factory('StartPrefs', function($window, $state, $interval) {
    var logger = $window.Logger;
    var startprefs = {};

    startprefs.loadDefaultTheme = function(prefs) {
        logger.log(logger.LEVEL_INFO, "About to set theme from preference")
        prefs.fetch('dark_theme').then(function(value) {
          logger.log(logger.LEVEL_INFO, "preferred dark_theme = "+value)
          if (value == true) {
            $rootScope.dark_theme = true;
          } else {
            $rootScope.dark_theme = false;
          }
          logger.log(logger.LEVEL_INFO, "set dark_theme = "+$rootScope.dark_theme)
        });
    };

    var changeState = function(destState) {
        console.log("loading "+destState);
        $state.go(destState);
        $interval.cancel(currPromise);
    };

    // Currently loads main or intro based on whether onboarding is complete.
    // But easily extensible to storing the last screen that the user was on,
    // or the users' preferred screen

    startprefs.loadPreferredScreen = function(prefs) {
        logger.log(logger.LEVEL_INFO, "About to navigate to preferred tab")
        prefs.fetch('setup_complete').then(function(value) {
          logger.log(logger.LEVEL_DEBUG, 'setup_complete result '+value);
          if (value == true) {
              logger.log(logger.LEVEL_INFO, 'changing state to root.main.diary');
              changeState('root.main.diary');
          } else {
              logger.log(logger.LEVEL_INFO, 'changing state to root.intro');
              changeState('root.intro');
          }
        }, function(error) {
          logger.log(logger.LEVEL_ERROR, "error "+error+" loading root.intro");
          changeState('root.intro');
        });
    };

    startprefs.loadWithPrefs = function() {
        console.log("Checking to see whether we are ready to load the screen");
        if ($window.plugins && $window.plugins.appPreferences && $window.Logger) {
          logger = $window.Logger;
          var prefs = plugins.appPreferences;
          startprefs.loadDefaultTheme(prefs);
          startprefs.loadPreferredScreen(prefs);
        } else {
          console.log("appPreferences plugin not installed, waiting...");
        }
    };

    var currPromise = null;
    startprefs.startWithPrefs = function() {
      currPromise = $interval(startprefs.loadWithPrefs, 1000);
    }
    return startprefs;
});
