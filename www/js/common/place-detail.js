'use strict';
angular.module('emission.main.common.place-detail',['ui-leaflet',
                                      'emission.services'])

.controller("CommonPlaceDetailCtrl", function($scope, $stateParams,
                                        CommonGraph) {
    $scope.placeId = $stateParams.placeId;
    $scope.place = CommonGraph.data.cPlaceId2ObjMap[$scope.placeId];

    $scope.succ_trips_places = $scope.place.succ_places.map(function(sp, index, array) {
      console.log("Considering succ_place "+sp);
      var cTrip = CommonGraph.getCommonTripForStartEnd($scope.placeId, sp._id.$oid);
      console.log("Found common trip "+cTrip);
      var retDict = {
        trip: cTrip,
        place: sp
      };
      return retDict;
    });
});
