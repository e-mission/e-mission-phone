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
    $cordovaInAppBrowser,
    $ionicPopup, $ionicHistory, ionicToast, $timeout, CommHelper, StartPrefs, EnketoSurvey, EnketoSurveyLaunch, $translate, $cordovaFile) {

  $scope.socketURL = 'https://emission-socket.byamarin.com';
  $scope.socket = io($scope.socketURL, { autoConnect: false });
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

  $scope.login = function() {
    window.cordova.plugins.BEMJWTAuth.signIn().then(function(userEmail) {
      // ionicToast.show(message, position, stick, time);
      // $scope.next();
      $scope.userEmail = userEmail;
      CommHelper.registerUser(function(successResult) {
          const uuid = successResult.uuid;
          return CommHelper.updateUser({branch: 'rciti2'}
          ).then(function() {
              return EnketoSurvey.getAllSurveyAnswers('manual/user_profile_survey');
          }).then(function(answers){
              return EnketoSurvey.getUserProfile({ uuid }, answers);
          }).then(function(userProfile){
            // if (userProfile) {
            //   ionicToast.show(userEmail, 'middle', false, 2500);
            //   $scope.finish();
            // } else {
              $scope.socket.open();
              $scope.socket.on('up-submit', function(data) {
                console.log('up-submit');
                $scope.socket.close();
                $cordovaInAppBrowser.close();
                $scope.socket.removeAllListeners('up-submit');
                setTimeout(function() {
                  ionicToast.show(data, 'middle', false, 2500);
                  $scope.finish();
                }, 20);
              });
              const thisUuid = uuid ? uuid : 'undefined';
              $scope.socket.emit('up-listen', thisUuid);
              // const returnURL = 'https://htmlpreview.github.io/?https://gist.githubusercontent.com/atton16/7305f4cb843089ede8dcbf0a69f00d40/raw/3120c4a696a0981666e858f1fd54012eaae49b0c/user-profile-success.html';
              const returnURL = $scope.socketURL + '/up-submit/' + thisUuid + '/' + userEmail;
              console.log('returnURL', returnURL);
              $cordovaInAppBrowser.open(`https://up.byamarin.com/${thisUuid}&returnURL=${returnURL}`, '_blank');

              // $rootScope.$on('$cordovaInAppBrowser:message', function(params){
              //   console.log(params);
              //   if(params.data.action == 'close') {
              //     $cordovaInAppBrowser.close();
              //     setTimeout(function() {
              //       ionicToast.show(userEmail, 'middle', false, 2500);
              //       $scope.finish();
              //     }, 20);
              //   }
              // });
              // EnketoSurveyLaunch.launch($scope, 'UserProfile', { disableDismiss: true }
              // ).then(function(success){
              //   if (success) {
              //     ionicToast.show(userEmail, 'middle', false, 2500);
              //     $scope.finish();
              //   }
              // });
            // }
          });
      }, function(errorResult) {
        ionicToast.show(userEmail, 'middle', false, 2500);
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

