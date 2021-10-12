angular.module('emission.main.common.place-list',['ui-leaflet',
                                      'emission.main.common.services',
                                      'emission.services'])

.controller("CommonPlaceListCtrl", function($window, $scope, $rootScope, $ionicPlatform, $state,
                                    CommonGraph) {
  console.log("controller CommonListCtrl called");
  $scope.places = CommonGraph.data.graph.common_places;
});
