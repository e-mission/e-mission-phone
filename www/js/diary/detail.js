'use strict';
angular.module('emission.main.diary.detail',['ui-leaflet', 'nvd3ChartDirectives',
                                      'ionic-datepicker',
                                      'emission.services'])

.controller("DiaryDetailCtrl", function($scope, $stateParams,
                                        Timeline, DiaryHelper,Config) {
  console.log("controller DiaryDetailCtrl called with params = "+
    JSON.stringify($stateParams));

  $scope.mapCtrl = {};

  angular.extend($scope.mapCtrl, {
    defaults : Config.getMapTiles()
  });
  $scope.arrowColor = DiaryHelper.arrowColor;
  $scope.parseEarlierOrLater = DiaryHelper.parseEarlierOrLater;
  $scope.getEarlierOrLater = DiaryHelper.getEarlierOrLater;
  $scope.getLongerOrShorter = DiaryHelper.getLongerOrShorter;
  $scope.getIcon = DiaryHelper.getIcon;
  $scope.getHumanReadable = DiaryHelper.getHumanReadable;
  $scope.getPercentages = DiaryHelper.getPercentages;
  $scope.allModes = DiaryHelper.allModes;
  $scope.trip = Timeline.getTrip($stateParams.tripId);
  $scope.getKmph = DiaryHelper.getKmph;
  $scope.getFormattedDistance = DiaryHelper.getFormattedDistance;
  $scope.getSectionDetails = DiaryHelper.getSectionDetails;
  $scope.getFormattedTime = DiaryHelper.getFormattedTime;
  $scope.getFormattedTimeRange = DiaryHelper.getFormattedTimeRange;
  $scope.getFormattedDuration = DiaryHelper.getFormattedDuration;
  $scope.getTripDetails = DiaryHelper.getTripDetails
  $scope.tripgj = DiaryHelper.directiveForTrip($scope.trip);
  
  console.log("trip.start_place = " + JSON.stringify($scope.trip.start_place));
})
