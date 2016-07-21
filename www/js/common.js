angular.module('emission.main.common',['ui-leaflet',
                                      'ionic-datepicker',
                                      'emission.main.common.map',
                                      'emission.main.common.list',
                                      'emission.main.common.detail',
                                      'emission.main.common.services',
                                      'emission.services'])
.config(function($stateProvider, $ionicConfigProvider, $urlRouterProvider) {
  $stateProvider

  .state('root.main.common.map', {
    url: '/map',
    views: {
      'menuContent': {
        templateUrl: 'templates/common/map.html',
        controller: 'CommonMapCtrl'
      }
    }
  })

  .state('root.main.common.list', {
    url: '/places',
    views: {
      'menuContent': {
        templateUrl: 'templates/common/list.html',
        controller: 'CommonListCtrl'
      }
    }
  })

  .state('root.main.common.place-detail', {
    url: '/places/:placeId',
    views: {
        'menuContent': {
            templateUrl: 'templates/common/detail.html',
            controller: 'CommonDetailCtrl'
        }
     }
  });
})

.controller("CommonCtrl", function($scope, $http, $ionicPopup,
                                    leafletData, CommonGraph,Config) {
  console.log("controller CommonCtrl called");
});
