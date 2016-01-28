// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'emission' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'emission.services' is found in services.js
// 'emission.controllers' is found in controllers.js
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

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
    .state('main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/main.html'
  })

  .state('main.dash', {
    url: '/dash',
    views: {
      'main-dash': {
        templateUrl: 'templates/main-dash.html',
        controller: 'DashCtrl'
      }
    }
  })

  .state('main.chats', {
      url: '/chats',
      views: {
        'main-chats': {
          templateUrl: 'templates/main-chats.html',
          controller: 'ChatsCtrl'
        }
      }
    })
    .state('main.chat-detail', {
      url: '/chats/:chatId',
      views: {
        'main-chats': {
          templateUrl: 'templates/chat-detail.html',
          controller: 'ChatDetailCtrl'
        }
      }
    })

  .state('main.account', {
    url: '/account',
    views: {
      'main-account': {
        templateUrl: 'templates/main-account.html',
        controller: 'AccountCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/main/dash');

});
