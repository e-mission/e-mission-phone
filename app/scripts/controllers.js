'use strict';

angular.module('emission.controllers', [])

.controller('IntroCtrl', function($scope, $state, $ionicSlideBoxDelegate, $ionicPopup, ionicToast, $timeout) {
  $scope.getIntroBox = function() {
    return $ionicSlideBoxDelegate.$getByHandle('intro-box');
  };

  $scope.stopSliding = function() {
    $scope.getIntroBox().enableSlide(false);
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

  $scope.startApp = function() {
    $state.go('main.dash');
  };

  $scope.next = function() {
    $scope.getIntroBox().next();
  };

  $scope.previous = function() {
    $scope.getIntroBox().previous();
  };

  $scope.login = function() {
    window.cordova.plugins.BEMJWTAuth.signIn(function(userEmail) {
      // ionicToast.show(message, position, stick, time);
      // $scope.next();
      ionicToast.show(userEmail, 'middle', false, 2500);
      $timeout($scope.next, 2500, true, null).then(function() {
        console.log('finished moving to the next screen');
      }); 
    }, function(error) {
      var errorMsg = JSON.stringify(error);
      var alertPopup = $ionicPopup.alert({
        title: 'Sign-in error',
        template: errorMsg
      });
   
      alertPopup.then(function(res) {
        window.Logger.log(window.Logger.LEVEL_INFO, errorMsg + ' ' + res);
      });
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
})

.controller('DashCtrl', function($scope) {})


.controller('ChatsCtrl', function($scope, Chats) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
