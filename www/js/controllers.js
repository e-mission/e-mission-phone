'use strict';

angular.module('emission.controllers', ['emission.splash.updatecheck',
                                        'emission.splash.startprefs'])

.controller('RootCtrl', function($scope) {})

.controller('DashCtrl', function($scope) {})

.controller('SplashCtrl', function($scope, $state, $interval, $rootScope,
    UpdateCheck, StartPrefs) {
  console.log('SplashCtrl invoked');
  alert("attach debugger!");
  UpdateCheck.checkForUpdates();
  StartPrefs.startWithPrefs();

  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    console.log("Finished changing state from "+JSON.stringify(fromState)
        + " to "+JSON.stringify(toState));
    /*
    if ($rootScope.checkedForUpdates) {
      window.Logger.log(window.Logger.log("Already checked for update, skipping"));
    } else {
      UpdateCheck.checkForUpdates();
      $rootScope.checkedForUpdates = true;
    } */
  });
  console.log('SplashCtrl invoke finished');
})


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
