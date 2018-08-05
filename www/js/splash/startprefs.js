angular.module('emission.splash.startprefs', ['emission.plugin.logger',
                                              'emission.splash.referral',
                                              'angularLocalStorage'])

.factory('StartPrefs', function($window, $state, $interval, $rootScope, $ionicPlatform,
      $ionicPopup, storage, $http, Logger, ReferralHandler) {
    var logger = Logger;
    var nTimesCalled = 0;
    var startprefs = {};
    var DEFAULT_THEME_KEY = 'curr_theme';
     // Boolean: represents that the "intro" - the one page summary
     // and the login are done
    var INTRO_DONE_KEY = 'intro_done';
    // data collection consented protocol: string, represents the date on
    // which the consented protocol was approved by the IRB
    var DATA_COLLECTION_CONSENTED_PROTOCOL = 'data_collection_consented_protocol';

    var CONSENTED_KEY = "config/consent";

    startprefs.CONSENTED_EVENT = "data_collection_consented";
    startprefs.INTRO_DONE_EVENT = "intro_done";

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
      return startprefs.readConsentState().then(writeConsentToNative).then(function(response) {
          // mark in local storage
          storage.set(DATA_COLLECTION_CONSENTED_PROTOCOL,
            $rootScope.req_consent);
          // mark in local variable as well
          $rootScope.curr_consented = angular.copy($rootScope.req_consent);
          $rootScope.$emit(startprefs.CONSENTED_EVENT, $rootScope.req_consent);
      });
    };

    startprefs.markIntroDone = function() {
      storage.set(INTRO_DONE_KEY, true);
      // Need to initialize this first because if we try to
      // create it inlike with {key: value}, the key becomes the
      // word "INTRO_DONE_KEY" and the stored object is
      // {"INTRO_DONE_KEY":"2018-01-31T06:26:02+00:00"}
      var to_store = {};
      to_store[INTRO_DONE_KEY] = moment().format();
      $window.cordova.plugins.BEMUserCache.putLocalStorage(INTRO_DONE_KEY, to_store);
      $rootScope.$emit(startprefs.INTRO_DONE_EVENT, $rootScope.req_consent);
    }

    // returns boolean
    startprefs.isIntroDone = function() {
      var read_val = storage.get(INTRO_DONE_KEY);
      logger.log("in isIntroDone, read_val = "+read_val);
      if (read_val == null || read_val == "") {
        logger.log("in isIntroDone, returning false");
        return false;
      } else {
        logger.log("in isIntroDone, returning "+read_val);
        return read_val;
      }
    }

    startprefs.isConsented = function() {
      logger.log("curr_consented = "+$rootScope.curr_consented+
            "isIntroDone = " + startprefs.isIntroDone());
      if (startprefs.isIntroDone() &&
            ($rootScope.curr_consented == null || $rootScope.curr_consented == "")) {
        alert("intro is done, but consent not found, re-consenting...");
      }
      if ($rootScope.curr_consented == null || $rootScope.curr_consented == "" ||
            $rootScope.curr_consented.approval_date != $rootScope.req_consent.approval_date) {
        console.log("Not consented in local storage, need to show consent");
        return false;
      } else {
        console.log("Consented in local storage, no need to show consent");
        return true;
      }
    }

    startprefs.readConsentState = function() {
      /*
       * Read from local storage and move on so that we don't depend on native code.
       * Native code will be checked once the plugins are ready
       */
      if (angular.isDefined($rootScope.req_consent) &&
          angular.isDefined($rootScope.curr_consented) &&
          $rootScope.curr_consented != null) {
          // consent state is all populated
          logger.log("req_consent = "+$rootScope.req_consent
                        +" curr_consented = " + $rootScope.curr_consented);
          return new Promise(function(resolve, reject) {
            logger.log("resolving with empty information");
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
          .then(startprefs.readConsentState)
          .then(startprefs.isConsented)
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
                startprefs.readConsentState()
                    .then(startprefs.isConsented)
                    .then(function(consentState) {
                        if (consentState == true) {
                            $ionicPopup.alert({template: "Local consent found, native consent missing, writing consent to native"});
                            return writeConsentToNative();
                        }
                    });
            }
        });
    }

    startprefs.checkUsercacheStorage = function(key) {
        // console.log("checkUsercacheStorage called");
        var ls_stored_val = storage.get(key);
        $window.cordova.plugins.BEMUserCache.getLocalStorage(key, false).then(function(uc_stored_val) {
            logger.log("uc_stored_val = "+JSON.stringify(uc_stored_val)+" ls_stored_val = "+ls_stored_val);
            if(angular.isDefined(uc_stored_val) && (uc_stored_val != null)
                && (key in uc_stored_val) && angular.isDefined(uc_stored_val[key])) {
                if (ls_stored_val == true) {
                    logger.log("local intro_done true, remote intro_done "+uc_stored_val[key]+", already synced");
                } else {
                    logger.log("local intro_done false, remote intro_done "+uc_stored_val[key]+", setting local");
                    $ionicPopup.alert({template: "Local "+key+" not found, native "+key+" found, writing "+key+" to local"})
                    storage.put(key, true);
                }
            } else {
                if (ls_stored_val == true) {
                    logger.log("local intro_done found, remote intro_done not found, setting remote");

                    // Need to initialize this first because if we try to
                    // create it inlike with {key: value}, the key becomes the
                    // word "key" and the stored object is
                    // {"key":"2018-01-31T06:26:02+00:00"}
                    var to_put = {};
                    to_put[key] = moment().format();
                    $window.cordova.plugins.BEMUserCache.putLocalStorage(key, to_put);
                    $ionicPopup.alert({template: "Local "+key+" found, native "+key+" missing, writing "+key+" to native"})
                } else {
                    logger.log("local intro_done false, remote intro_done not found, already synced");
                }
            }
        }).catch(function(error) {
            var display_msg = error.message + "\n" + error.stack;
            logger.log("error in checkUsercacheStorage = "+display_msg);
            $ionicPopup.alert({template: display_msg});
        });
    }

    startprefs.checkStorageConsistency = function() {
        // console.log("checkStorageConsistency called");
        startprefs.checkNativeConsent();
        startprefs.checkUsercacheStorage(INTRO_DONE_KEY);
    }

    startprefs.getNextState = function() {
      return startprefs.getPendingOnboardingState().then(function(result){
        if (result == null) {
          var temp = ReferralHandler.getReferralNavigation();
          if (temp == 'goals') {
            return 'root.main.goals';
          } else if ($rootScope.displayingIncident == true) {
            $rootScope.displayingIncident = false;
            return 'root.main.incident';
          } else if (angular.isDefined($rootScope.redirectTo)) {
            var redirState = $rootScope.redirectTo;
            $rootScope.redirectTo = undefined;
            return redirState;
          } else {
            return 'root.main.accessmap';
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
      if (!angular.isDefined($window.Logger)) {
          alert("ionic is ready, but logger not present?");
      }
      logger = Logger;
      startprefs.loadDefaultTheme();
      startprefs.loadPreferredScreen();
    };

    startprefs.startWithPrefs = function() {
      startprefs.loadWithPrefs();
    }

    $ionicPlatform.ready().then(function() {
      Logger.log("ionicPlatform.ready() called " + nTimesCalled+" times!");
      nTimesCalled = nTimesCalled + 1;
      startprefs.startWithPrefs();
      startprefs.checkStorageConsistency();
      Logger.log("startprefs startup done");
    });

    return startprefs;
});
