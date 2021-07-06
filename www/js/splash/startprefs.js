angular.module('emission.splash.startprefs', ['emission.plugin.logger',
                                              'emission.splash.referral',
                                              'emission.plugin.kvstore'])

.factory('StartPrefs', function($window, $state, $interval, $rootScope, $ionicPlatform,
      $ionicPopup, KVStore, storage, $http, Logger, ReferralHandler) {
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

    var writeConsentToNative = function() {
      return $window.cordova.plugins.BEMDataCollection.markConsented($rootScope.req_consent);
    };

    startprefs.markConsented = function() {
      logger.log("changing consent from "+
        $rootScope.curr_consented+" -> "+JSON.stringify($rootScope.req_consent));
      // mark in native storage
      return startprefs.readConsentState().then(writeConsentToNative).then(function(response) {
          // mark in local storage
          KVStore.set(DATA_COLLECTION_CONSENTED_PROTOCOL,
            $rootScope.req_consent);
          // mark in local variable as well
          $rootScope.curr_consented = angular.copy($rootScope.req_consent);
          $rootScope.$emit(startprefs.CONSENTED_EVENT, $rootScope.req_consent);
      });
    };

    startprefs.markIntroDone = function() {
      var currTime = moment().format();
      KVStore.set(INTRO_DONE_KEY, currTime);
      $rootScope.$emit(startprefs.INTRO_DONE_EVENT, currTime);
    }

    // returns boolean
    startprefs.readIntroDone = function() {
      return KVStore.get(INTRO_DONE_KEY).then(function(read_val) {
          logger.log("in readIntroDone, read_val = "+JSON.stringify(read_val));
          $rootScope.intro_done = read_val;
      });
    }

    startprefs.isIntroDone = function() {
      if ($rootScope.intro_done == null || $rootScope.intro_done == "") {
        logger.log("in isIntroDone, returning false");
        $rootScope.is_intro_done = false;
        return false;
      } else {
        logger.log("in isIntroDone, returning true");
        $rootScope.is_intro_done = true;
        return true;
      }
    }

    startprefs.isConsented = function() {
      if ($rootScope.curr_consented == null || $rootScope.curr_consented == "" ||
            $rootScope.curr_consented.approval_date != $rootScope.req_consent.approval_date) {
        console.log("Not consented in local storage, need to show consent");
        $rootScope.is_consented = false;
        return false;
      } else {
        console.log("Consented in local storage, no need to show consent");
        $rootScope.is_consented = true;
        return true;
      }
    }

    startprefs.readConsentState = function() {
      // read consent state from the file and populate it
      return $http.get("json/startupConfig.json")
          .then(function(startupConfigResult) {
              $rootScope.req_consent = startupConfigResult.data.emSensorDataCollectionProtocol;
              logger.log("required consent version = " + JSON.stringify($rootScope.req_consent));
              return KVStore.get(DATA_COLLECTION_CONSENTED_PROTOCOL);
          }).then(function(kv_store_consent) {
              $rootScope.curr_consented = kv_store_consent;
              console.assert(angular.isDefined($rootScope.req_consent), "in readConsentState $rootScope.req_consent", JSON.stringify($rootScope.req_consent));
              // we can just launch this, we don't need to wait for it
              startprefs.checkNativeConsent();
          });
    }

    /*
     * getNextState() returns a promise, since reading the startupConfig is
     * async. The promise returns an onboarding state to navigate to, or
     * null for the default state
     */

    startprefs.getPendingOnboardingState = function() {
      return startprefs.readStartupState().then(function([is_intro_done, is_consented]) {
        if (!is_intro_done) {
            console.assert(!$rootScope.intro_done, "in getPendingOnboardingState first check, $rootScope.intro_done", JSON.stringify($rootScope.intro_done));
            return 'root.intro';
        } else {
        // intro is done. Now let's check consent
            console.assert(is_intro_done, "in getPendingOnboardingState, local is_intro_done", is_intro_done);
            console.assert($rootScope.is_intro_done, "in getPendingOnboardingState, $rootScope.intro_done", $rootScope.intro_done);
            if (is_consented) {
                return null;
            } else {
                return 'root.reconsent';
            }
        }
      });
    };

    /*
     * Read the intro_done and consent_done variables into the $rootScope so that
     * we can use them without making multiple native calls
     */
    startprefs.readStartupState = function() {
        var readIntroPromise = startprefs.readIntroDone()
                                    .then(startprefs.isIntroDone);
        var readConsentPromise = startprefs.readConsentState()
                                    .then(startprefs.isConsented);
        return Promise.all([readIntroPromise, readConsentPromise]);
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
                if(startprefs.isConsented()) {
                    logger.log("Local consent found, native consent missing, writing consent to native");
                    $ionicPopup.alert({template: "Local consent found, native consent missing, writing consent to native"});
                    return writeConsentToNative();
                } else {
                    logger.log("Both local and native consent not found, nothing to sync");
                }
            }
        });
    }

    startprefs.getNextState = function() {
      return startprefs.getPendingOnboardingState().then(function(result){
        if (result == null) {
          var temp = ReferralHandler.getReferralNavigation();
          if (temp == 'goals') {
            return {state: 'root.main.goals', params: {}};
          } else if ($rootScope.displayingIncident) {
            logger.log("Showing tripconfirm from startprefs");
            return {state: 'root.main.diary'};
          } else if (angular.isDefined($rootScope.redirectTo)) {
            var redirState = $rootScope.redirectTo;
            $rootScope.redirectTo = undefined;
            return {state: redirState, params: {}};
          } else {
            return {state: 'root.main.metrics', params: {}};
          }
        } else {
          return {state: result, params: {}};
        }
      });
    };

    var changeState = function(destState) {
        logger.log('changing state to '+destState);
        console.log("loading "+destState);
        // TODO: Fix this the right way when we fix the FSM
        // https://github.com/e-mission/e-mission-phone/issues/146#issuecomment-251061736
        var reload = false;
        if (($state.$current == destState.state) && ($state.$current.name == 'root.main.goals')) {
          reload = true;
        }
        $state.go(destState.state, destState.params).then(function() {
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
        logger.displayError("Error loading preferred tab, loading root.intro", error);
        // logger.log("error "+error+" loading finding tab, loading root.intro");
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
      startprefs.loadPreferredScreen();
    };

    startprefs.startWithPrefs = function() {
      startprefs.loadWithPrefs();
    }

    $ionicPlatform.ready().then(function() {
      Logger.log("ionicPlatform.ready() called " + nTimesCalled+" times!");
      nTimesCalled = nTimesCalled + 1;
      startprefs.startWithPrefs();
      Logger.log("startprefs startup done");
    });

    return startprefs;
});
