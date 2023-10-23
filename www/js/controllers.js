'use strict';

import angular from 'angular';
import { addStatError, addStatReading, statKeys } from './plugin/clientStats';

angular.module('emission.controllers', ['emission.splash.startprefs',
                                        'emission.splash.pushnotify',
                                        'emission.splash.localnotify',
                                        'emission.splash.remotenotify'])

.controller('RootCtrl', function($scope) {})

.controller('DashCtrl', function($scope) {})

.controller('SplashCtrl', function($scope, $state, $interval, $rootScope, 
    StartPrefs, PushNotify,
    LocalNotify, RemoteNotify)  {
  console.log('SplashCtrl invoked');
  // alert("attach debugger!");
  // PushNotify.startupInit();

  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    console.log("Finished changing state from "+JSON.stringify(fromState)
        + " to "+JSON.stringify(toState));
    addStatReading(statKeys.STATE_CHANGED, fromState.name + '-2-' + toState.name);
  });
  $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error){
    console.log("Error "+error+" while changing state from "+JSON.stringify(fromState)
      +" to "+JSON.stringify(toState));
    addStatError(statKeys.STATE_CHANGED, fromState.name + '-2-' + toState.name+ "_" + error);
  });
  $rootScope.$on('$stateNotFound',
    function(event, unfoundState, fromState, fromParams){
        console.log("unfoundState.to = "+unfoundState.to); // "lazy.state"
        console.log("unfoundState.toParams = " + unfoundState.toParams); // {a:1, b:2}
        console.log("unfoundState.options = " + unfoundState.options); // {inherit:false} + default options
    addStatError(statKeys.STATE_CHANGED, fromState.name + '-2-' + unfoundState.name);
  });

  var isInList = function(element, list) {
    return list.indexOf(element) != -1
  }

  $rootScope.$on('$stateChangeStart',
    function(event, toState, toParams, fromState, fromParams, options){
      var personalTabs = ['root.main.common.map',
                          'root.main.control',
                          'root.main.metrics']
      if (isInList(toState.name, personalTabs)) {
        // toState is in the personalTabs list
        StartPrefs.getPendingOnboardingState().then(function(result) {
          if (result != null) {
            event.preventDefault();
            $state.go(result);
          };
          // else, will do default behavior, which is to go to the tab
        });
      }
  })
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
