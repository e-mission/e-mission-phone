import angular from 'angular';
import { getConfig } from '../config/dynamicConfig';

angular.module('emission.splash.startprefs', ['emission.plugin.logger',
                                              'emission.splash.referral',
                                              'emission.plugin.kvstore'])

.factory('StartPrefs', function($window, $state, $interval, $rootScope, $ionicPlatform,
      $ionicPopup, KVStore, $http, Logger, ReferralHandler) {
    var logger = Logger;
    var startprefs = {};
     // Boolean: represents that the "intro" - the one page summary
     // and the login are done
    var INTRO_DONE_KEY = 'intro_done';
    // data collection consented protocol: string, represents the date on
    // which the consented protocol was approved by the IRB
    var DATA_COLLECTION_CONSENTED_PROTOCOL = 'data_collection_consented_protocol';

    var CONSENTED_KEY = "config/consent";

    startprefs.CONSENTED_EVENT = "data_collection_consented";
    startprefs.INTRO_DONE_EVENT = "intro_done";

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

    startprefs.readConfig = function() {
        return getConfig().then((savedConfig) => $rootScope.app_ui_label = savedConfig);
    }

    startprefs.hasConfig = function() {
      if ($rootScope.app_ui_label == undefined ||
          $rootScope.app_ui_label == null ||
          $rootScope.app_ui_label == "") {
        logger.log("Config not downloaded, need to show join screen");
        $rootScope.has_config = false;
        return false;
      } else {
        $rootScope.has_config = true;
        logger.log("Config downloaded, skipping join screen");
        return true;
      }
    }

    /*
     * Read the intro_done and consent_done variables into the $rootScope so that
     * we can use them without making multiple native calls
     */
    startprefs.readStartupState = function() {
        console.log("STARTPREFS: about to read startup state");
        var readIntroPromise = startprefs.readIntroDone()
                                    .then(startprefs.isIntroDone);
        var readConsentPromise = startprefs.readConsentState()
                                    .then(startprefs.isConsented);
        var readConfigPromise = startprefs.readConfig()
                                    .then(startprefs.hasConfig);
        return Promise.all([readIntroPromise, readConsentPromise, readConfigPromise]);
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

    return startprefs;
});
