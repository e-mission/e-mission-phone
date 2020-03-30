'use strict';

angular.module('emission.intro', ['emission.splash.startprefs',
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

.controller('IntroCtrl', function($scope, $state, $ionicSlideBoxDelegate,
    $ionicPopup, $ionicHistory, ionicToast, $timeout, CommHelper, StartPrefs, $translate, $cordovaFile) {
  
  $scope.getConsentFile = function () {
    var lang = $translate.use();
    $scope.consentFile = "templates/intro/consent.html";
    if (lang != 'en') {
      var url = "www/i18n/intro/consent-" + lang + ".html";
      $cordovaFile.checkFile(cordova.file.applicationDirectory, url).then( function(result){
        window.Logger.log(window.Logger.LEVEL_DEBUG,
          "Successfully found the consent file, result is " + JSON.stringify(result));
        $scope.consentFile = url.replace("www/", "");
      }, function (err) {
        window.Logger.log(window.Logger.LEVEL_DEBUG,
          "Consent file not found, loading english version, error is " + JSON.stringify(err));
          $scope.consentFile = "templates/intro/consent.html";
        });
    }
  }
  
  $scope.getConsentFile();

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
        $scope.finish();
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
      ionicToast.show(userEmail, 'middle', false, 2500);
      CommHelper.registerUser(function(successResult) {
        $scope.finish();
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

