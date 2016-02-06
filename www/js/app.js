// Ionic E-Mission App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'emission' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'emission.services' is found in services.js
// 'emission.controllers' is found in controllers.js
'use strict';

angular.module('emission', ['ionic', 'emission.controllers','emission.services'])

.run(function($ionicPlatform) {
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
})

.config(function($stateProvider, $urlRouterProvider) {
  var waitFn = function($q) {
      var deferred = $q.defer();
      ionic.Platform.ready(function() {
          window.Logger.init();
          window.Logger.log(window.Logger.LEVEL_INFO, 'ionic.Platform.ready');

          // Init the stats
          window.cordova.plugins.BEMClientStats.init();
          // Init the sync on iOS, due to restrictions on background
          // operation, the sync code will be invoked from the data collection
          // when a remote push arrives. But on android a service is involved
          // so the sync and the data collection can appear in parallel.
          window.cordova.plugins.BEMUserCache.init();
          window.cordova.plugins.BEMServerSync.init();
          window.cordova.plugins.BEMDataCollection.startupInit();
          // We don't actually resolve with anything, because we don't need to return
          // anything. We just need to wait until the platform is
          // ready and at that point, we can use our usual window.sqlitePlugin stuff
          deferred.resolve();
      });
      return deferred.promise;
  };

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the root
    .state('root', {
    url: '/root',
    abstract: true,
    template: '<ui-view/>',
    resolve: {
        cordova: waitFn
    },
    controller: 'RootCtrl'
  })

  // setup an abstract state for the intro directive
    .state('root.intro', {
    url: '/intro',
    templateUrl: 'templates/intro/intro.html',
    controller: 'IntroCtrl'
  })

  // setup an abstract state for the tabs directive
    .state('root.main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/main.html',
    controller: 'DashCtrl'
  })

  .state('root.main.dash', {
    url: '/dash',
    views: {
      'main-dash': {
        templateUrl: 'templates/main-dash.html',
        controller: 'DashCtrl'
      }
    }
  })

  .state('root.main.chats', {
      url: '/chats',
      views: {
        'main-chats': {
          templateUrl: 'templates/main-chats.html',
          controller: 'ChatsCtrl'
        }
      }
    })
    .state('root.main.chat-detail', {
      url: '/chats/:chatId',
      views: {
        'main-chats': {
          templateUrl: 'templates/chat-detail.html',
          controller: 'ChatDetailCtrl'
        }
      }
    })

  .state('root.main.account', {
    url: '/account',
    views: {
      'main-account': {
        templateUrl: 'templates/main-account.html',
        controller: 'AccountCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/root/intro');

});
