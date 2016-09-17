// Ionic E-Mission App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'emission' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'emission.services' is found in services.js
// 'emission.controllers' is found in controllers.js
'use strict';

angular.module('emission', ['ionic','ionic.service.core', 'emission.controllers','emission.services',
    'emission.intro', 'emission.main'])

.run(function($ionicPlatform, $rootScope) {
  console.log("Starting run");
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
  console.log("Ending run");
})

.config(function($stateProvider, $urlRouterProvider) {
  console.log("Starting config");

  var waitFn = function($q) {
      var deferred = $q.defer();
      ionic.Platform.ready(function() {
         deferred.resolve();
      });
      return deferred.promise;
  };

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set a few states which the app can be in.
  // The 'intro' and 'diary' states are found in their respective modules
  // Each state's controller can be found in controllers.js
  $stateProvider
  // set up a state for the splash screen. This has no parents and no children
  // because it is basically just used to load the user's preferred screen.
  // This cannot directly use plugins - has to check for them first.
  .state('splash', {
        url: '/splash',
        templateUrl: 'templates/splash/splash.html',
        controller: 'SplashCtrl'
  })

  // setup an abstract state for the root. Only children of this can be loaded
  // as preferred screens, and all children of this can assume that the device
  // is ready.
  .state('root', {
    url: '/root',
    abstract: true,
    template: '<ion-nav-view/>',
    controller: 'RootCtrl'
  });

  // alert("about to fall back to otherwise");
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/splash');
  console.log("Ending config");
});


function parseURL(url) {
  var addr = url.split('//')[1];
  var route = addr.split('?')[0];
  var params = addr.split('?')[1];
  var paramsList = params.split('&');
  var rtn = {route: route};
  for (var i = 0; i < paramsList.length; i++) {
    rtn[paramsList[i].split('=')[0]] = paramsList[i].split('=')[1];
  }
  return rtn;
}
function handleOpenURL(url) {
  setTimeout(function() {
    var kvList = parseURL(url);
    // There are 3 types of users in total
    
    if (kvList.route == 'join') {
      var INTRO_DONE_KEY = 'intro_done';
      var HABITICA_REGISTERED_KEY = 'habitica_registered';
      var REFERRAL_NAVIGATION_KEY = 'referral_navigation';
      var REFERED_KEY = 'refered';
      var REFERED_GROUP_ID = 'refered_group_id';
      var REFERED_USER_ID = 'refered_user_id'
      window.localStorage.setItem(REFERED_KEY, true);
      window.localStorage.setItem(REFERED_GROUP_ID, kvList['groupid']);
      window.localStorage.setItem(REFERED_USER_ID, kvList['userid']);
      if (window.localStorage.getItem(INTRO_DONE_KEY) == false) { 
        // User type 1: Completely new user
        window.localStorage.setItem(REFERRAL_NAVIGATION_KEY, 'goals');
        
      } else if (window.localStorage.getItem(HABITICA_REGISTERED_KEY) != null) { // INTRO_DONE_KEY == true
        // User type 2: User already has the app, but not yet activated the game
        // maybe redirect to game tab? and alert that you sure you want to join this group?
        window.localStorage.setItem(REFERRAL_NAVIGATION_KEY, 'goals');
        // type 2 is different from type 1 in that type 2 user is navigated to metrics AND asked to register first

      } else { // Intro done && registered
        // User type 3: User already has the game, and part of the game
        window.localStorage.setItem(REFERRAL_NAVIGATION_KEY, 'goals');

      }
    }
  }, 0);
}
    