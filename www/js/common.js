angular.module('emission.main.common',['ui-leaflet',
                                      'emission.main.common.map',
                                      'emission.main.common.trip-list',
                                      'emission.main.common.place-list',
                                      'emission.main.common.trip-detail',
                                      'emission.main.common.place-detail',
                                      'emission.main.common.services',
                                      'emission.services'])
.config(function($stateProvider, $urlRouterProvider) {

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

  .state('root.main.common.place-list', {
    url: '/places',
    views: {
      'menuContent': {
        templateUrl: 'templates/common/place-list.html',
        controller: 'CommonPlaceListCtrl'
      }
    }
  })

  .state('root.main.common.place-detail', {
    url: '/places/:placeId',
    views: {
        'menuContent': {
            templateUrl: 'templates/common/place-detail.html',
            controller: 'CommonPlaceDetailCtrl'
        }
     }
  })

  .state('root.main.common.trip-list', {
    url: '/trips',
    views: {
      'menuContent': {
        templateUrl: 'templates/common/trip-list.html',
        controller: 'CommonTripListCtrl'
      }
    }
  })

  .state('root.main.common.trip-detail', {
    url: '/trips/:tripId',
    views: {
        'menuContent': {
            templateUrl: 'templates/common/trip-detail.html',
            controller: 'CommonTripDetailCtrl'
        }
     }
  })
})

.controller("CommonCtrl", function($scope, $http, $ionicPopup,
                                    leafletData, CommonGraph,Config) {
  console.log("controller CommonCtrl called");
});
