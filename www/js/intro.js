'use strict';

angular.module('emission.intro', ['emission.splash.startprefs',
                                  'ionic-toast',
                                  'emission.survey.enketo.launch',
                                  'emission.enketo-survey.service',
                                ])

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

.controller('IntroCtrl', function($scope, $state, $window, $ionicSlideBoxDelegate,
    $ionicPopup, $ionicHistory, ionicToast, $timeout, CommHelper, StartPrefs, SurveyLaunch, $translate) {

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

  // copy-pasted from ngCordova, and updated to promises
  $scope.checkFile = function(directory, fn) {
    return new Promise(function(resolve, reject) {
      if ((/^\//.test(file))) {
        reject('directory cannot start with \/');
      }

      try {
        var directory = path + file;
        $window.resolveLocalFileSystemURL(directory, function (fileSystem) {
          if (fileSystem.isFile === true) {
            resolve(fileSystem);
          } else {
            reject({code: 13, message: 'input is not a file'});
          }
        }, function (error) {
          reject({code: error.code, message: "error while resolving URL "+directory});
        });
      } catch (err) {
        err.message = "$window.resolveLocalFileSystemURL not found";
        reject(err);
      }
    });
  }

  console.log("Explanation = "+$scope.locationPermExplanation);

  // The language comes in between the first and second part
  $scope.geti18nFile = function (fpFirstPart, fpSecondPart) {
    var lang = $translate.use();
    var defaultVal = fpFirstPart + fpSecondPart;
    if (lang != 'en') {
      var url = fpFirstPart + lang + fpSecondPart;
      $scope.checkFile(cordova.file.applicationDirectory, url).then( function(result){
        window.Logger.log(window.Logger.LEVEL_DEBUG,
          "Successfully found the consent file, result is " + JSON.stringify(result));
        return url.replace("www/", "");
      }, function (err) {
        window.Logger.log(window.Logger.LEVEL_DEBUG,
          "Consent file not found, loading english version, error is " + JSON.stringify(err));
           return defaultVal;
        });
    }
    return defaultVal;
  }
  
  $scope.consentFile = $scope.geti18nFile("templates/intro/consent", ".html");
  $scope.explainFile = $scope.geti18nFile("templates/intro/sensor_explanation", ".html");

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

  $scope.startSurvey = function () {
      SurveyLaunch.startSurveyWithXPath(
        'https://ee.kobotoolbox.org/x/hEkHk50v',
        '/html/body/div[1]/article/form/section[2]/label[1]/input');
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

  $scope.login = function() {
    window.cordova.plugins.BEMJWTAuth.signIn().then(function(userEmail) {
      $scope.startSurvey()
      ionicToast.show(userEmail, 'middle', false, 2500);
      CommHelper.registerUser(function(successResult) {
        return CommHelper.updateUser({branch: 'nrel-lh-v0'}
          ).then(function() {
            $scope.finish();
          });
      }, function(errorResult) {
        $scope.alertError('User registration error', errorResult);
        $scope.finish();
      });
    }, function(error) {
        $scope.alertError('Sign in error', error);
        $scope.finish();
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
});

