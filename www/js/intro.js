'use strict';

angular.module('emission.intro', ['ionic-toast'])

.config(function($stateProvider) {
  $stateProvider
  // setup an abstract state for the intro directive
    .state('root.intro', {
    url: '/intro',
    templateUrl: 'templates/intro/intro.html',
    controller: 'IntroCtrl'
  })
})

.controller('IntroCtrl', function($scope, $state, $ionicSlideBoxDelegate, 
        $ionicPopup, ionicToast, $timeout, CommHelper) {
  $scope.getIntroBox = function() {
    return $ionicSlideBoxDelegate.$getByHandle('intro-box');
  };

  $scope.stopSliding = function() {
    $scope.getIntroBox().enableSlide(false);
  };

  $scope.showSettings = function() {
    window.cordova.plugins.BEMConnectionSettings.getSettings(function(settings) {
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

  $scope.popupUninstall = function() {
    var alertPopup = $ionicPopup.alert({
      title: 'Conditions refused',
      template: 'Please close and uninstall this application. You must accept the terms to use E-Mission'
    });
 
    alertPopup.then(function(res) {
      window.Logger.log(window.Logger.LEVEL_INFO, 'User confirmed that they understood that consent is required'+res);
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
    window.cordova.plugins.BEMJWTAuth.signIn(function(userEmail) {
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
    var prefs = window.plugins.appPreferences;
    prefs.store('setup_complete', true).then(function(value) {
        // $scope.alertError("setup_complete", "success -> "+value);
        $state.go('root.main.diary');
    }, function(error) {
        $scope.alertError("setup_complete", "error -> "+error);
    });
  }
});

