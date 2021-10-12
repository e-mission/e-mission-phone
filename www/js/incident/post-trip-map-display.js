'use strict';
angular.module('emission.incident.posttrip.map',['ui-leaflet', 'ng-walkthrough',
                                      'emission.plugin.kvstore',
                                      'emission.services', 'emission.plugin.logger',
                                      'emission.main.diary.services',
                                      'emission.incident.posttrip.manual'])

.controller("PostTripMapCtrl", function($scope, $window, $state,
                                        $stateParams, $ionicLoading,
                                        leafletData, leafletMapEvents, nzTour, KVStore,
                                        Logger, Timeline, DiaryHelper, Config,
                                        UnifiedDataLoader, PostTripManualMarker, $translate) {
  Logger.log("controller PostTripMapDisplay called with params = "+
    JSON.stringify($stateParams));
  $scope.mapCtrl = {};
  angular.extend($scope.mapCtrl, {
    defaults: {}
  });
  angular.extend($scope.mapCtrl.defaults, Config.getMapTiles());
  var LOC_KEY = "background/filtered_location";

  $scope.mapCtrl.start_ts = $stateParams.start_ts;
  $scope.mapCtrl.end_ts = $stateParams.end_ts;

  /*
  var mapEvents = leafletMapEvents.getAvailableMapEvents();
  for (var k in mapEvents) {
    var eventName = 'leafletDirectiveMap.incident.' + mapEvents[k];
    $scope.$on(eventName, function(event, data){
        Logger.log("in mapEvents, event = "+JSON.stringify(event.name)+
              " leafletEvent = "+JSON.stringify(data.leafletEvent.type)+
              " leafletObject = "+JSON.stringify(data.leafletObject.getBounds()));
        $scope.eventDetected = event.name;
    });
  }
  */

  $scope.refreshMap = function(start_ts, end_ts) {
    var db = $window.cordova.plugins.BEMUserCache;
    var tq = {key: "write_ts",
              startTs: start_ts,
              endTs: end_ts};
    $scope.mapCtrl.cache = {};
    $scope.mapCtrl.server = {};
    // Clear everything before we start loading new data
    $scope.mapCtrl.geojson = {};
    $scope.mapCtrl.geojson.pointToLayer = DiaryHelper.pointFormat;
    $scope.mapCtrl.geojson.data = {
        type: "Point",
        coordinates: [-122, 37],
        properties: {
          feature_type: "location"
        }
    };
    Logger.log("About to query buffer for "+JSON.stringify(tq));
    $ionicLoading.show({
      template: $translate.instant('loading')
    });
    UnifiedDataLoader.getUnifiedSensorDataForInterval(LOC_KEY, tq)
      // .then(PostTripManualMarker.addLatLng)
      .then(function(resultList) {
        Logger.log("Read data of length "+resultList.length);
        $ionicLoading.show({
          template: 'Mapping '+resultList.length+' points'
        });
        if (resultList.length > 0) {
          // $scope.mapCtrl.cache.points = PostTripManualMarker.addLatLng(resultList);
          // $scope.mapCtrl.cache.points = resultList;
          // Logger.log("Finished adding latlng");
          var pointCoords = resultList.map(function(locEntry) {
            return [locEntry.data.longitude, locEntry.data.latitude];
          });
          var pointTimes = resultList.map(function(locEntry) {
            return locEntry.data.ts;
          });
          $scope.mapCtrl.cache.features = [{
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: pointCoords,
              properties: {
                times: pointTimes
              }
            }
          }];
          $scope.mapCtrl.cache.data = {
            type: "FeatureCollection",
            features: $scope.mapCtrl.cache.features,
            properties: {
              start_ts: start_ts,
              end_ts: end_ts
            }
          };

          Logger.log("About to get section points");
          var points = resultList.map(function(locEntry) {
            var coords = [locEntry.data.longitude, locEntry.data.latitude];
            // Logger.log("coords = "+coords);
            return {loc: coords,
                latlng: L.GeoJSON.coordsToLatLng(coords),
                ts: locEntry.data.ts};
          });
          /*
          var points = PostTripManualMarker.addLatLng(resultList);
          */
          $scope.mapCtrl.cache.points = points;
          Logger.log("Finished getting section points");
              /*
          $scope.mapCtrl.cache.points = resultList.map(function(locEntry) {
              Logger.log("locEntry = "+JSON.serialize(locEntry));
              var currMappedPoint = {loc: locEntry.data.loc,
                latlng: L.GeoJSON.coordsToLatLng(locEntry.data.loc),
                ts: locEntry.data.ts};
              Logger.log("Mapped point "+ JSON.stringify(locEntry)+" to "+currMappedPoint);
              return currMappedPoint;
             return locEntry.data.ts;
          });
          Logger.log("Finished getting section points");
              */

          $scope.mapCtrl.cache.loaded = true;
          $scope.$apply(function() {
            // data is in the cache, so we can just load it from there
            // Logger.log("About to set geojson = "+JSON.stringify($scope.mapCtrl.cache.data));
            $scope.mapCtrl.geojson.data = $scope.mapCtrl.cache.data;
          });

          leafletData.getMap('incident').then(function(map) {
            Logger.log("registered click receiver");
            map.on('click', PostTripManualMarker.startAddingIncidentToPoints(map,
                $scope.mapCtrl.cache.points,
                $scope.mapCtrl.cache.features));
          });
        }
        $ionicLoading.hide();
    })
    .catch(function(error) {
        $ionicLoading.hide();
        Logger.displayError("Unable to retrieve location data for map", error);
    });
  }

  $scope.refreshWholeMap = function() {
    $scope.refreshMap($scope.mapCtrl.start_ts, $scope.mapCtrl.end_ts);
  }

  $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
  };

  $scope.getFormattedDate = DiaryHelper.getFormattedDate;
  $scope.getFormattedTime = DiaryHelper.getFormattedTime;
  $scope.refreshMap($scope.mapCtrl.start_ts, $scope.mapCtrl.end_ts);

  /* START: ng-walkthrough code */
  // Tour steps
  var tour = {
    config: {
      mask: {
        visibleOnNoTarget: true,
        clickExit: true
      },
      previousText: $translate.instant('tour-previous'),
      nextText: $translate.instant('tour-next'),
      finishText: $translate.instant('tour-finish')
    },
    steps: [{
      target: '#incident',
      content: $translate.instant('post-trip-map-display-tour-incident')
    }]
  };

  var startWalkthrough = function () {
    nzTour.start(tour).then(function(result) {
      Logger.log("list walkthrough start completed, no error");
    }).catch(function(err) {
      Logger.displayError("incident walkthrough start errored", err);
    });
  };


  var checkIncidentTutorialDone = function () {
    var INCIDENT_DONE_KEY = 'incident_tutorial_done';
    var incidentTutorialDone = KVStore.getDirect(INCIDENT_DONE_KEY);
    if (!incidentTutorialDone) {
      startWalkthrough();
      KVStore.set(INCIDENT_DONE_KEY, true);
    }
  };

  $scope.startWalkthrough = function () {
    startWalkthrough();
  }

  $scope.closeView = function () {
    $state.go('root.main.control');
  }

  $scope.$on('$ionicView.afterEnter', function(ev) {
    // Workaround from
    // https://github.com/driftyco/ionic/issues/3433#issuecomment-195775629
    if(ev.targetScope !== $scope)
      return;
    checkIncidentTutorialDone();
  });
  /* END: ng-walkthrough code */
});
