'use strict';

import angular from 'angular';
import QrCode from './control/QrCode';

angular.module('emission.intro', ['emission.splash.startprefs',
                                  'emission.survey.enketo.demographics',
                                  'emission.appstatus.permissioncheck',
                                  'emission.i18n.utils',
                                  'emission.config.dynamic',
                                  'ionic-toast',
                                  QrCode.module])

.config(function($stateProvider) {
  $stateProvider
  // setup an abstract state for the intro directive
    .state('root.intro', {
    url: '/intro',
    templateUrl: 'templates/intro/intro.html',
    controller: 'IntroCtrl'
  })
  .state('root.reconsent', {
    url: '/reconsent',
    templateUrl: 'templates/intro/reconsent.html',
    controller: 'IntroCtrl'
  });
})

.controller('IntroCtrl', function($scope, $rootScope, $state, $window,
    $ionicPlatform, $ionicSlideBoxDelegate,
    $ionicPopup, $ionicHistory, ionicToast, $timeout, CommHelper, StartPrefs, SurveyLaunch, DynamicConfig, i18nUtils) {

  /*
   * Move all the state that is currently in the controller body into the init
   * function so that we can reload if we need to
   */
  $scope.init = function() {
      var allIntroFiles = Promise.all([
        i18nUtils.geti18nFileName("templates/", "intro/summary", ".html"),
        i18nUtils.geti18nFileName("templates/", "intro/consent", ".html"),
        i18nUtils.geti18nFileName("templates/", "intro/sensor_explanation", ".html"),
        i18nUtils.geti18nFileName("templates/", "intro/survey", ".html")
      ]);
      allIntroFiles.then(function(allIntroFilePaths) {
        $scope.$apply(function() {
          console.log("intro files are "+allIntroFilePaths);
          $scope.summaryFile = allIntroFilePaths[0];
          $scope.consentFile = allIntroFilePaths[1];
          $scope.explainFile = allIntroFilePaths[2];
          $scope.surveyFile = allIntroFilePaths[3];
        });
      });
  }

  $scope.getIntroBox = function() {
    return $ionicSlideBoxDelegate.$getByHandle('intro-box');
  };

  $scope.stopSliding = function() {
    $scope.getIntroBox().enableSlide(false);
  };

  $scope.showSettings = function() {
    window.cordova.plugins.BEMConnectionSettings.getSettings().then(function(settings) {
      var errorMsg = JSON.stringify(settings);
      var alertPopup = $ionicPopup.alert({
        title: 'settings',
        template: errorMsg
      });

      alertPopup.then(function(res) {
        $scope.next();
      });
    }, function(error) {
        $scope.alertError('getting settings', error);
    });
  };

  $scope.overallStatus = false;

  /* If the user does not consent, we boot them back out to the join screen */
  $scope.disagree = function() {
    // reset the saved config, then trigger a hard refresh
    const CONFIG_PHONE_UI="config/app_ui_config";
    $window.cordova.plugins.BEMUserCache.putRWDocument(CONFIG_PHONE_UI, {})
        .then($window.location.reload(true));
  };

  $scope.agree = function() {
    $scope.scannedToken = $scope.ui_config.joined.opcode;
    StartPrefs.markConsented().then(function(response) {
      $ionicHistory.clearHistory();
      if ($scope.scannedToken) {
        $scope.login($scope.scannedToken);
      } else {
          if ($state.is('root.intro')) {
            $scope.next();
          } else {
            StartPrefs.loadPreferredScreen();
          }
      }
    });
  };

  $scope.next = function() {
    $scope.getIntroBox().next();
  };

  $scope.previous = function() {
    $scope.getIntroBox().previous();
  };

  $scope.alertError = function(title, errorResult) {
      var errorMsg = JSON.stringify(errorResult);
      var alertPopup = $ionicPopup.alert({
        title: title,
        template: errorMsg
      });

      alertPopup.then(function(res) {
        window.Logger.log(window.Logger.LEVEL_INFO, errorMsg + ' ' + res);
      });
  }

  $scope.login = function(token) {
    window.cordova.plugins.OPCodeAuth.setOPCode(token).then(function(opcode) {
      // ionicToast.show(message, position, stick, time);
      // $scope.next();
      ionicToast.show(opcode, 'middle', false, 2500);
      if (opcode == "null" || opcode == "") {
        $scope.alertError("Invalid login "+opcode);
      } else {
        CommHelper.registerUser(function(successResult) {
          $scope.currentToken = token;
          $scope.next();
        }, function(errorResult) {
          $scope.alertError('User registration error', errorResult);
        });
      }
    }, function(error) {
        $scope.alertError('Sign in error', error);
    });

  };

  $scope.shareQR = function() {
    var prepopulateQRMessage = {};
    const c = document.getElementsByClassName('qrcode-link');
    const cbase64 = c[0].getAttribute('href');
    prepopulateQRMessage.files = [cbase64];
    prepopulateQRMessage.url = $scope.currentToken;

    window.plugins.socialsharing.shareWithOptions(prepopulateQRMessage, function(result) {
      console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
      console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
    }, function(msg) {
      console.log("Sharing failed with message: " + msg);
    });
  };

  // Called each time the slide changes
  $scope.slideChanged = function(index) {
    $scope.slideIndex = index;
    /*
     * The slidebox is created as a child of the HTML page that this controller
     * is associated with, so it is not available when the controller is created.
     * There is an onLoad, but it is for ng-include, not for random divs, apparently.
     * Trying to create a new controller complains because then both the
     * directive and the controller are trying to ask for a new scope.
     * So instead, I turn off swiping after the initial summary is past.
     * Since the summary is not legally binding, it is fine to swipe past it...
     */
    if (index > 0) {
        $scope.getIntroBox().enableSlide(false);
    }
  };

  $scope.finish = function() {
    // this is not a promise, so we don't need to use .then
    StartPrefs.markIntroDone();
    $scope.getIntroBox().slide(0);
    StartPrefs.loadPreferredScreen();
    // remove this view since the intro is done
    // when we go back to the intro state, it will be recreated
    $("[state='root.intro']").remove();
    $scope.$destroy();
  }

  $ionicPlatform.ready().then(function() {
    console.log("app is launched, currently NOP");
  });

  $ionicPlatform.ready().then(() => {
      DynamicConfig.configReady().then((newConfig) => {
        Logger.log("Resolved UI_CONFIG_READY promise in intro.js, filling in templates");
        $scope.lang = i18next.resolvedLanguage;
        $scope.ui_config = newConfig;

        // backwards compat hack to fill in the raw_data_use for programs that don't have it
        const default_raw_data_use = {
            "en": `to monitor the ${newConfig.intro.program_or_study}, send personalized surveys or provide recommendations to participants`,
            "es": `para monitorear el ${newConfig.intro.program_or_study}, enviar encuestas personalizadas o proporcionar recomendaciones a los participantes`
        }
        Object.entries(newConfig.intro.translated_text).forEach(([lang, val]) => {
            val.raw_data_use = val.raw_data_use || default_raw_data_use[lang];
        });
        // TODO: we should be able to use i18n for this, right?
        $scope.template_text = newConfig.intro.translated_text[$scope.lang];
        if (!$scope.template_text) {
            $scope.template_text = newConfig.intro.translated_text["en"]
        }
        // Backwards compat hack to fill in the `app_required` based on the
        // old-style "program_or_study"
        // remove this at the end of 2023 when all programs have been migrated over
        if ($scope.ui_config.intro.app_required == undefined) {
            $scope.ui_config.intro.app_required = $scope.ui_config?.intro.program_or_study == 'program';
        }
        $scope.ui_config.opcode = $scope.ui_config.opcode || {};
        if ($scope.ui_config.opcode.autogen == undefined) {
            $scope.ui_config.opcode.autogen = $scope.ui_config?.intro.program_or_study == 'study';
        }
        $scope.init();
      });
    });
});
