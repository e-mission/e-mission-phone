'use strict';

angular.module('emission.controllers', ['emission.splash.updatecheck',
                                        'emission.splash.startprefs',
                                        'emission.splash.pushnotify',
                                        'emission.splash.localnotify',
                                        'emission.survey.launch',
                                        'emission.stats.clientstats',
                                        'emission.incident.posttrip.prompt'])

.controller('RootCtrl', function($scope) {})

.controller('DashCtrl', function($scope) {})

.controller('SplashCtrl', function($scope, $state, $interval, $rootScope, 
    UpdateCheck, StartPrefs, PushNotify,
    LocalNotify, ClientStats, PostTripAutoPrompt, SurveyLaunch)  {
  console.log('SplashCtrl invoked');
  // alert("attach debugger!");
  // PushNotify.startupInit();

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
    ClientStats.addReading(ClientStats.getStatKeys().STATE_CHANGED,
      fromState.name + '-2-' + toState.name).then(function() {}, function() {});
  });
  $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error){
    console.log("Error "+error+" while changing state from "+JSON.stringify(fromState)
      +" to "+JSON.stringify(toState));
    ClientStats.addError(ClientStats.getStatKeys().STATE_CHANGED,
      fromState.name + '-2-' + toState.name+ "_" + error).then(function() {}, function() {});
  });
  $rootScope.$on('$stateNotFound',
    function(event, unfoundState, fromState, fromParams){
        console.log("unfoundState.to = "+unfoundState.to); // "lazy.state"
        console.log("unfoundState.toParams = " + unfoundState.toParams); // {a:1, b:2}
        console.log("unfoundState.options = " + unfoundState.options); // {inherit:false} + default options
    ClientStats.addError(ClientStats.getStatKeys().STATE_CHANGED,
      fromState.name + '-2-' + unfoundState.name).then(function() {}, function() {});
  });

  var isInList = function(element, list) {
    return list.indexOf(element) != -1
  }

  $rootScope.$on('$stateChangeStart',
    function(event, toState, toParams, fromState, fromParams, options){
      var personalTabs = ['root.main.common.map',
                          'root.main.control',
                          'root.main.metrics',
                          'root.main.goals',
                          'root.main.diary']
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
