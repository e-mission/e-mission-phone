'use strict';

angular.module('emission.main', ['emission.main.recent'])

.config(function($stateProvider, $ionicConfigProvider) {
  $stateProvider
  // setup an abstract state for the tabs directive
    .state('root.main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/main.html',
    controller: 'MainCtrl'
  })

  .state('root.main.diary', {
    url: '/diary',
    views: {
      'main-diary': {
        templateUrl: 'templates/main-dash.html',
        controller: 'MainCtrl'
      }
    }
  })

  .state('root.main.recent', {
      url: '/recent',
      abstract: true,
      views: {
        'main-recent': {
          templateUrl: 'templates/main-recent.html',
          controller: 'MainCtrl'
        }
      }
    })
  .state('root.main.control', {
    url: '/control',
    views: {
      'main-control': {
        templateUrl: 'templates/main-control.html',
        controller: 'MainCtrl'
      }
    }
  });

  $ionicConfigProvider.tabs.style('standard')
  $ionicConfigProvider.tabs.position('bottom');
})

.controller('MainCtrl', function($scope, $state) {
    // Currently this is blank since it is basically a placeholder for the
    // three screens. But we can totally add hooks here if we want. It is the
    // controller for all the screens because none of them do anything for now.
});
