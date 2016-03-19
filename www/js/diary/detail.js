'use strict';

angular.module('emission.main.diary.detail',['ui-leaflet', 'nvd3ChartDirectives',
                                      'ionic-datepicker'])

.controller("DiaryDetailCtrl", function($scope, $stateParams, Timeline) {
  console.log("controller DiaryDetailCtrl called with params = "+
    JSON.stringify($stateParams));
  $scope.trip = Timeline.getTrip($stateParams.tripId);
})
