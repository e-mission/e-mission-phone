'use strict';
angular.module('emission.main.diary.editMode',['ui-leaflet', 'ng-walkthrough',
                                      'ionic-datepicker', 'nvd3', 'angularLocalStorage',
                                      'emission.services', 'emission.plugin.logger',
                                      'emission.incident.posttrip.manual'])

.controller("EditModeCtrl", function($scope, $rootScope, $window, $stateParams, $ionicActionSheet,
                                        leafletData, leafletMapEvents, nzTour, storage,
                                        Logger, Timeline, DiaryHelper, Config,
                                        CommHelper, PostTripManualMarker, EditModeFactory, $ionicHistory) {
  console.log("controller editMode called with params = "+
    JSON.stringify($stateParams));

  $scope.mapCtrl = {};
  angular.extend($scope.mapCtrl, {
    defaults : {
    }
  });

  angular.extend($scope.mapCtrl.defaults, Config.getMapTiles())

  $scope.$on('leafletDirectiveMap.detail.resize', function(event, data) {
      console.log("diary/editMode received resize event, invalidating map size");
      data.leafletObject.invalidateSize();
  });

  $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
  };

  $scope.getFormattedDate = DiaryHelper.getFormattedDate;
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
  $scope.tripgj = DiaryHelper.directiveForTrip($scope.trip, true);
  console.log($scope.tripgj);
  console.log($scope.trip);

  $scope.save = function() {
    EditModeFactory.save($scope.trip)
    $ionicHistory.goBack()
  }

  $scope.cancel = function() {
    EditModeFactory.clear()
    $ionicHistory.goBack()
  }

  $scope.getTripBackground = function() {
     var ret_val = DiaryHelper.getTripBackground($rootScope.dark_theme, $scope.tripgj);
     return ret_val;
  }

  console.log("trip.start_place = " + JSON.stringify($scope.trip.start_place));

  // leafletData.getMap('detail').then(function(map) {
  //   map.on('click', PostTripManualMarker.startAddingIncidentToTrip($scope.trip, map));
  // });


  $scope.editMode = function(param) {
    $state.go('root.main.diary-edit-mode', {tripId: param});
  }
})
