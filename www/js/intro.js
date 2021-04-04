'use strict';


angular.module('emission.intro', ['emission.splash.startprefs',
                                  'emission.splash.updatecheck',
                                  'emission.i18n.utils',
                                  'ionic-toast', 'angularLocalStorage'])

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

.controller('IntroCtrl', function($scope, $rootScope, $state, $window, $ionicSlideBoxDelegate,
    $ionicPopup, $ionicHistory, ionicToast, $timeout, CommHelper, StartPrefs, SurveyLaunch, UpdateCheck, $translate, i18nUtils) {

  $scope.platform = $window.device.platform;
  $scope.osver = $window.device.version.split(".")[0];
  if($scope.platform.toLowerCase() == "android") {
    if($scope.osver < 6) {
        $scope.locationPermExplanation = $translate.instant('intro.permissions.locationPermExplanation-android-lt-6');
    } else if ($scope.osver < 10) {
        $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-android-gte-6");
    } else {
        $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-android-gte-10");
    }
  }

  if($scope.platform.toLowerCase() == "ios") {
    if($scope.osver < 13) {
        $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-ios-lt-13");
    } else {
        $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-ios-gte-13");
    }
  }

  $scope.backgroundRestricted = false;
  if($window.device.manufacturer.toLowerCase() == "samsung") {
    $scope.backgroundRestricted = true;
    $scope.allowBackgroundInstructions = $translate.instant("intro.allow_background.samsung");
  }

  $scope.fitnessPermNeeded = ($scope.platform.toLowerCase() == "ios" ||
    (($scope.platform.toLowerCase() == "android") && ($scope.osver >= 10)));

  console.log("Explanation = "+$scope.locationPermExplanation);

  var allIntroFiles = Promise.all([
    i18nUtils.geti18nFileName("templates/", "intro/summary", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/consent", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/sensor_explanation", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/login", ".html")
  ]);
  allIntroFiles.then(function(allIntroFilePaths) {
    $scope.$apply(function() {
      console.log("intro files are "+allIntroFilePaths);
      $scope.summaryFile = allIntroFilePaths[0];
      $scope.consentFile = allIntroFilePaths[1];
      $scope.explainFile = allIntroFilePaths[2];
      $scope.loginFile = allIntroFilePaths[3];
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

  $scope.disagree = function() {
    $state.go('root.main.bear');
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
  $scope.startSurvey = function () {
      SurveyLaunch.startSurveyPrefilled(
        'https://docs.google.com/forms/d/e/1FAIpQLSfA-JCnD5Tb2olZn0UAO91_juU-wuToxJc6uHdMjEQoSi-YTw/viewform',
        'entry.779873496');
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

  var changeURLIfNeeded = function(userEmail) {
    if (userEmail.startsWith("STAGE_")) {
        $rootScope.connectionConfig.connectUrl = "https://stage.canbikeco.org";
        $rootScope.connectUrl = "https://stage.canbikeco.org";
        return window.cordova.plugins.BEMConnectionSettings.setSettings($rootScope.connectionConfig);
    } else {
        return Promise.resolve();
    }
  }

  $scope.login = function() {
    window.cordova.plugins.BEMJWTAuth.signIn().then(function(userEmail) {
      // ionicToast.show(message, position, stick, time);
      // $scope.next();
      ionicToast.show(userEmail, 'middle', false, 2500);
      if (userEmail == "null" || userEmail == "") {
        $scope.alertError("Invalid login "+userEmail);
      } else {
        changeURLIfNeeded(userEmail).then(function() {
            CommHelper.registerUser(function(successResult) {
              UpdateCheck.getChannel().then(function(retVal) {
                CommHelper.updateUser({
                 client: retVal
                });
              });
              if (localStorage.getItem('username') != null) {
                $scope.finish();
              } else {
                $scope.showUsernamePopup();
              }
            }, function(errorResult) {
              $scope.alertError('User registration error', errorResult);
            });
        }).catch(function(error) {
            $scope.alertError('connection settings error', error);
        });
      }
    }, function(error) {
        $scope.alertError('Sign in error', error);
    });
  };

  $scope.showUsernamePopup = function() {
  $scope.data = {};

  var usernamePopup = $ionicPopup.show({
    template: '<input type="userEmail" ng-model="data.wifi">', //This is wifi because i copoied pasted code, afraid to change it (dont fix what ain't broke!)
    title: 'Create a new username/Edit your username (no spaces allowed)',
    scope: $scope,
    buttons: [
      {
        text: '<b>Save</b>',
        type: 'button-positive',
        onTap: function(e) {
          if (!$scope.data.wifi) {
            //don't allow the user to close unless he enters a username

            e.preventDefault();
          } else {
            if ($scope.data.wifi.indexOf(' ') >= 0) {
              e.preventDefault();
            }
            return $scope.data.wifi;
          }
        }
      }
    ]
  });
  usernamePopup.then(function(res) {
    console.log('Tapped!', res);
    CommHelper.setUsername(res);
    localStorage.setItem("username", res);
    $scope.startSurvey();
    $scope.finish();
  });
}


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
});
