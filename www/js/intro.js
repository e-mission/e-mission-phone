'use strict';

angular.module('emission.intro', ['emission.splash.startprefs',
                                  'emission.splash.secretcheck',
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
    $cordovaInAppBrowser, $rootScope,
    $ionicPopup, $ionicHistory, ionicToast, $timeout, CommHelper, StartPrefs, EnketoSurvey, SecretCheck, $translate, $cordovaFile) {

  $scope.platform = $window.device.platform;
  $scope.osver = $window.device.version.split(".")[0];
  if($scope.platform.toLowerCase() == "android") {
    if($scope.osver < 6) {
        $scope.locationPermExplanation = $translate.instant('intro.permissions.locationPermExplanation-android-lt-6');
    } else {
        $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-android-gte-6");
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
  if($window.device.manufacturer.toLowerCase() == "huawei") {
    $scope.backgroundRestricted = true;
    $scope.allowBackgroundInstructions = $translate.instant("intro.allow_background.huawei");
  }

  console.log("Explanation = "+$scope.locationPermExplanation);

  // The language comes in between the first and second part
  $scope.geti18nFile = function (fpFirstPart, fpSecondPart) {
    var lang = $translate.use();
    var defaultVal = fpFirstPart + fpSecondPart;
    if (lang != 'en') {
      var url = fpFirstPart + lang + fpSecondPart;
      $cordovaFile.checkFile(cordova.file.applicationDirectory, url).then( function(result){
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

  $scope.generateRandomToken = function(length) {
    var randomInts = window.crypto.getRandomValues(new Uint8Array(length * 2));
    var randomChars = Array.from(randomInts).map((b) => String.fromCharCode(b));
    var randomString = randomChars.join("");
    var validRandomString = window.btoa(randomString).replace(/[+/]/g, "");
    return validRandomString.substring(0, length);
  }

  $scope.disagree = function() {
    $state.go('root.main.heatmap');
  };

  $scope.agree = function() {
    StartPrefs.markConsented().then(function(response) {
      $scope.randomToken = $scope.generateRandomToken(8);
      window.Logger.log("Signing in with random token "+$scope.randomToken);
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

  $scope.tokenToClipboard = function() {
    navigator.clipboard.writeText($scope.randomToken);
  };

  $scope.loginNew = function() {
    $scope.login($scope.randomToken);
  };

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

  $scope.login = function (token) {
    const comboToken = SecretCheck.SECRET + token;
    window.cordova.plugins.BEMJWTAuth.setPromptedAuthToken(comboToken).then(function(userEmail) {
      // ionicToast.show(message, position, stick, time);
      // $scope.next();
      $scope.userEmail = userEmail;
      ionicToast.show(userEmail, 'middle', false, 2500);
      if (userEmail == "null" || userEmail == "") {
        $scope.alertError("Invalid login " + userEmail);
      } else {
        CommHelper.registerUser(function (successResult) {
          const uuid = successResult.uuid;
          return CommHelper.updateUser({ branch: 'rciti1' }
          ).then(function () {
            const thisUuid = uuid ? uuid : 'undefined';
            const returnURL = `https://emission-app.byamarin.com/survey-success-static/`;
            console.log('returnURL', returnURL);
            const iab = $window.cordova.InAppBrowser.open(`https://up.byamarin.com/${thisUuid}&returnURL=${returnURL}`, '_blank');
            const listener = function(event) {
              console.log("started loading, event = " + JSON.stringify(event));
              if (
                event.url == 'https://emission-app.byamarin.com/survey-success-static/' ||
                event.url == 'https://ee.kobotoolbox.org/thanks'
              ) {
                iab.removeEventListener('loadstart', listener);
                iab.close();
                ionicToast.show(userEmail, 'middle', false, 2500);
                $scope.finish();
              }
            };
            iab.addEventListener('loadstart', listener);
          });
        }, function (errorResult) {
          ionicToast.show(userEmail, 'middle', false, 2500);
          $scope.alertError('User registration error', errorResult);
          $scope.finish();
        });
      }
    }, function (error) {
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

