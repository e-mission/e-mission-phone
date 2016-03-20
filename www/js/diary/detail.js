'use strict';

angular.module('emission.main.diary.detail',['ui-leaflet', 'nvd3ChartDirectives',
                                      'ionic-datepicker'])

.controller("DiaryDetailCtrl", function($scope, $stateParams, Timeline) {
  console.log("controller DiaryDetailCtrl called with params = "+
    JSON.stringify($stateParams));

  $scope.mapCtrl = {};

  angular.extend($scope.mapCtrl, {
    defaults : {
      tileLayer: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      tileLayerOptions: {
          opacity: 0.9,
          detectRetina: true,
          reuseTiles: true,
      }
    } 
  });

  $scope.trip = Timeline.getTrip($stateParams.tripId);

  $scope.tripgj = {}
  $scope.tripgj.data = $scope.trip;
  console.log("trip.start_place = " + JSON.stringify($scope.trip.start_place));
})
