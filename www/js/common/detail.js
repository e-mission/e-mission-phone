'use strict';
angular.module('emission.main.common.detail',['ui-leaflet',
                                      'ionic-datepicker',
                                      'emission.services'])

.controller("CommonDetailCtrl", function($scope, $stateParams,
                                        CommonGraph) {
    $scope.placeId = $stateParams.placeId;
    $scope.place = CommonGraph.data.cPlaceId2ObjMap[$scope.placeId];
});
