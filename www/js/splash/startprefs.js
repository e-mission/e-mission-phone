angular.module('emission.splash.startprefs', ['emission.plugin.logger',
                                              'emission.splash.referral',
                                              'angularLocalStorage'])

.factory('StartPrefs', function($window, $state, $interval, $rootScope,
      $ionicPopup, storage, $http, Logger, ReferralHandler) {
    var logger = Logger;
    var startprefs = {};
    var DEFAULT_THEME_KEY = 'curr_theme';
     // Boolean: represents that the "intro" - the one page summary
     // and the login are done
    var INTRO_DONE_KEY = 'intro_done';
    // data collection consented protocol: string, represents the date on
    // which the consented protocol was approved by the IRB
    var DATA_COLLECTION_CONSENTED_PROTOCOL = 'data_collection_consented_protocol';

    var CONSENTED_KEY = "config/consent";

    startprefs.setDefaultTheme = function(new_theme) {
      storage.set(DEFAULT_THEME_KEY, new_theme);
    }

    startprefs.getDefaultTheme = function() {
      return storage.get(DEFAULT_THEME_KEY);
    }

    startprefs.loadDefaultTheme = function() {
        logger.log("About to set theme from preference");
        var curr_theme = startprefs.getDefaultTheme();
        logger.log("preferred theme = "+curr_theme);

        if (curr_theme == 'dark_theme') {
            $rootScope.dark_theme = true;
        } else {
            $rootScope.dark_theme = false;
        }
        logger.log("set dark_theme = "+$rootScope.dark_theme);
    };

    var writeConsentToNative = function() {
     return $window.cordova.plugins.BEMDataCollection.markConsented($rootScope.req_consent);
    };

    startprefs.markConsented = function() {
      logger.log("changing consent from "+
        $rootScope.curr_consented+" -> "+$rootScope.req_consent);
      // mark in native storage
      return readConsentState().then(writeConsentToNative).then(function(response) {
          // mark in local storage
          storage.set(DATA_COLLECTION_CONSENTED_PROTOCOL,
            $rootScope.req_consent);
          // mark in local variable as well
          $rootScope.curr_consented = angular.copy($rootScope.req_consent);
      });
    };

    startprefs.markIntroDone = function() {
      storage.set(INTRO_DONE_KEY, true);
    }

    // returns boolean
    startprefs.isIntroDone = function() {
      var read_val = storage.get(INTRO_DONE_KEY);
      if (read_val == null || read_val == "") {
        return false;
      } else {
        return read_val;
      }
    }

    $rootScope.isConsented = function() {
      if ($rootScope.curr_consented == null || $rootScope.curr_consented == "") {
        logger.log("curr_consented = "+$rootScope.curr_consented+
            "INTRO_DONE_KEY" + storage.get(INTRO_DONE_KEY));
        alert("why is curr_consented null when intro is done?");
      }
      if ($rootScope.curr_consented.approval_date != $rootScope.req_consent.approval_date) {
        console.log("Not consented in local storage, need to show consent");
        return false;
      } else {
        console.log("Consented in local storage, no need to show consent");
        return true;
      }
    }

    var readConsentState = function() {
      /*
       * Read from local storage and move on so that we don't depend on native code.
       * Native code will be checked once the plugins are ready
       */
      if (angular.isDefined($rootScope.req_consent) &&
          angular.isDefined($rootScope.curr_consented)) {
          // consent state is all populated
          return new Promise(function(resolve, reject) {
            resolve();
          });
      } else {
          // read consent state from the file and populate it
          return $http.get("json/startupConfig.json")
              .then(function(startupConfigResult) {
                  $rootScope.req_consent = startupConfigResult.data.emSensorDataCollectionProtocol;
                  logger.log("required consent version = " + JSON.stringify($rootScope.req_consent));
                  $rootScope.curr_consented = storage.get(
                    DATA_COLLECTION_CONSENTED_PROTOCOL);
          });
      }
    }

    /*
     * getNextState() returns a promise, since reading the startupConfig is
     * async. The promise returns an onboarding state to navigate to, or
     * null for the default state
     */

    startprefs.getPendingOnboardingState = function() {
      if (!startprefs.isIntroDone()) {
        // Since we must return a promise when the intro is done,
        // we create and return one here even though we don't need it
        return new Promise(function(resolve, reject) {
          resolve('root.intro');
        });
      } else {
        // intro is done. Now, let's read and check the current version
        // of the startup config
        return $http.get("json/startupConfig.json")
          .then(readConsentState)
          .then($rootScope.isConsented)
          .then(function(result) {
            if (result) {
              return null;
            } else {
              return 'root.reconsent';
            }
          });
      }
    };

    startprefs.getConsentDocument = function() {
      return $window.cordova.plugins.BEMUserCache.getDocument("config/consent", false)
            .then(function(resultDoc) {
                if ($window.cordova.plugins.BEMUserCache.isEmptyDoc(resultDoc)) {
                    return null;
                } else {
                    return resultDoc;
                }
            });
    };

    startprefs.checkNativeConsent = function() {
        startprefs.getConsentDocument().then(function(resultDoc) {
            if (resultDoc == null) {
                readConsentState()
                    .then($rootScope.isConsented)
                    .then(writeConsentToNative)
                    .then(function() {
                        $ionicPopup.alert({template: "Local consent found, native consent missing, writing consent to native"});
                    });
            }
        });
    }

    startprefs.getNextState = function() {
      return startprefs.getPendingOnboardingState().then(function(result){
        if (result == null) {
          var temp = ReferralHandler.getReferralNavigation();
          if (temp == 'goals') {
            return 'root.main.goals';
          } else {
            return 'root.main.metrics';
          }
        } else {
          return result;
        }
      });
    };

    var changeState = function(destState) {
        logger.log('changing state to '+destState);
        console.log("loading "+destState);
        // TODO: Fix this the right way when we fix the FSM
        // https://github.com/e-mission/e-mission-phone/issues/146#issuecomment-251061736
        var reload = false;
        if (($state.$current == destState) && ($state.$current.name == 'root.main.goals')) {
          reload = true;
        }
        $state.go(destState).then(function() {
            if (reload) {
              $rootScope.$broadcast("RELOAD_GOAL_PAGE_FOR_REFERRAL")
            }
        });
        $interval.cancel(currPromise);
    };

    // Currently loads main or intro based on whether onboarding is complete.
    // But easily extensible to storing the last screen that the user was on,
    // or the users' preferred screen

    startprefs.loadPreferredScreen = function() {
      logger.log("About to navigate to preferred tab");
      startprefs.getNextState().then(changeState).catch(function(error) {
        logger.log("error "+error+" loading finding tab, loading root.intro");
        changeState('root.intro');
      });
    };

    startprefs.loadWithPrefs = function() {
        // alert("attach debugger!");
        console.log("Checking to see whether we are ready to load the screen");
        if (angular.isDefined($window.Logger)) {
          logger = Logger;
          startprefs.loadDefaultTheme();
          startprefs.loadPreferredScreen();
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
