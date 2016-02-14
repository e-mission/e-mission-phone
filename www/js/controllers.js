'use strict';

angular.module('emission.controllers', [])

.controller('RootCtrl', function($scope, $state, $ionicPopup) {
  console.log('RootCtrl invoked');
  alert("Time to add breakpoints");
  var prefs = window.plugins.appPreferences;
  prefs.fetch('setup_complete').then(function(value) {
      console.log('setup_complete result '+value);
      $scope.$apply(function() {
        if (value == true) {
            $state.go('root.main.diary');
        } else {
            $state.go('root.intro');
        }
      });
  }, function(error) {
      $scope.$apply(function() {
          $scope.alertError("setup_complete", "error -> "+error);
          $state.go('root.intro');
      });
  });
  console.log('RootCtrl invoke finished');
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
