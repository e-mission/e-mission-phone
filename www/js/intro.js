'use strict';

angular.module('emission.intro', ['emission.splash.startprefs',
                                  'emission.splash.updatecheck',
                                  'emission.survey.enketo.demographics',
                                  'emission.appstatus.permissioncheck',
                                  'emission.i18n.utils',
                                  'ionic-toast'])

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

.controller('IntroCtrl', function($scope, $rootScope, $http, $state, $window,
    $ionicPlatform, $ionicSlideBoxDelegate,
    $ionicPopup, $ionicHistory, ionicToast, $timeout, CommHelper, StartPrefs, SurveyLaunch, UpdateCheck, i18nUtils) {

  var allIntroFiles = Promise.all([
    i18nUtils.geti18nFileName("templates/", "intro/summary", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/consent", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/sensor_explanation", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/login", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/survey", ".html")
  ]);
  allIntroFiles.then(function(allIntroFilePaths) {
    $scope.$apply(function() {
      console.log("intro files are "+allIntroFilePaths);
      $scope.summaryFile = allIntroFilePaths[0];
      $scope.consentFile = allIntroFilePaths[1];
      $scope.explainFile = allIntroFilePaths[2];
      $scope.loginFile = allIntroFilePaths[3];
      $scope.surveyFile = allIntroFilePaths[4];
    });
  });

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

  $scope.disagree = function() {
    $state.go('root.main.heatmap');
  };

  $scope.agree = function() {
    StartPrefs.markConsented().then(function(response) {
      $ionicHistory.clearHistory();
      if ($state.is('root.intro')) {
        $scope.next();
      } else {
        StartPrefs.loadPreferredScreen();
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

  $scope.loginExisting = function() {
    $scope.data = {};
    const tokenPopup = $ionicPopup.show({
        template: '<input type="String" ng-model="data.existing_token">',
        title: 'Enter the existing token that you have',
        scope: $scope,
        buttons: [
          {
            text: '<b>OK</b>',
            type: 'button-positive',
            onTap: function(e) {
              if (!$scope.data.existing_token) {
                //don't allow the user to close unless he enters a username

                e.preventDefault();
              } else {
                return $scope.data.existing_token;
              }
            }
          },{
            text: '<b>Cancel</b>',
            type: 'button-stable',
            onTap: function(e) {
              return null;
            }
          }
        ]
    });
    tokenPopup.then(function(token) {
        if (token != null) {
            $scope.login(token);
        }
    }).catch(function(err) {
        $scope.alertError(err);
    });
  };

  $scope.login = function(token) {
    window.cordova.plugins.BEMJWTAuth.setPromptedAuthToken(token).then(function(userEmail) {
      // ionicToast.show(message, position, stick, time);
      // $scope.next();
      ionicToast.show(userEmail, 'middle', false, 2500);
      if (userEmail == "null" || userEmail == "") {
        $scope.alertError("Invalid login "+userEmail);
      } else {
        CommHelper.registerUser(function(successResult) {
            ionicToast.show(userEmail, 'middle', false, 2500);
            $scope.next();
            // $scope.finish();
        }, function(errorResult) {
          // ionicToast.show(userEmail, 'middle', false, 2500);
          $scope.alertError('User registration error', errorResult);
          // $scope.finish();
        });
      }
    }, function(error) {
        $scope.alertError('Sign in error', error);
        // $scope.finish();
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
  }

  $ionicPlatform.ready().then(function() {
    console.log("app is launched, currently NOP");
  });
});

