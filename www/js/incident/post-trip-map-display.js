'use strict';
angular.module('emission.incident.posttrip.map',['ui-leaflet', 'ng-walkthrough',
                                      'angularLocalStorage',
                                      'emission.services', 'emission.plugin.logger',
                                      'emission.main.diary.services',
                                      'emission.incident.posttrip.manual'])

.controller("PostTripMapCtrl", function($scope, $window,
                                        $stateParams, $ionicActionSheet,
                                        leafletData, leafletMapEvents, nzTour, storage,
                                        Logger, Timeline, DiaryHelper, Config,
                                        UnifiedDataLoader, PostTripManualMarker) {
  console.log("controller PostTripMapDisplay called with params = "+
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
        console.log("in mapEvents, event = "+JSON.stringify(event.name)+
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
    console.log("About to query buffer for "+JSON.stringify(tq));
    UnifiedDataLoader.getUnifiedSensorDataForInterval(LOC_KEY, tq)
      // .then(PostTripManualMarker.addLatLng)
      .then(function(resultList) {
        console.log("Read data of length "+resultList.length);
        if (resultList.length > 0) {
          // $scope.mapCtrl.cache.points = PostTripManualMarker.addLatLng(resultList);
          // $scope.mapCtrl.cache.points = resultList;
          // console.log("Finished adding latlng");
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

          console.log("About to get section points");
          var points = resultList.map(function(locEntry) {
            var coords = [locEntry.data.longitude, locEntry.data.latitude];
            // console.log("coords = "+coords);
            return {loc: coords,
                latlng: L.GeoJSON.coordsToLatLng(coords),
                ts: locEntry.data.ts};
          });
          /*
          var points = PostTripManualMarker.addLatLng(resultList);
          */
          $scope.mapCtrl.cache.points = points;
          console.log("Finished getting section points");
              /*
          $scope.mapCtrl.cache.points = resultList.map(function(locEntry) {
              console.log("locEntry = "+JSON.serialize(locEntry));
              var currMappedPoint = {loc: locEntry.data.loc,
                latlng: L.GeoJSON.coordsToLatLng(locEntry.data.loc),
                ts: locEntry.data.ts};
              Logger.log("Mapped point "+ JSON.stringify(locEntry)+" to "+currMappedPoint);
              return currMappedPoint;
             return locEntry.data.ts;
          });
          console.log("Finished getting section points");
              */

          $scope.mapCtrl.cache.loaded = true;
          $scope.$apply(function() {
            // data is in the cache, so we can just load it from there
            // console.log("About to set geojson = "+JSON.stringify($scope.mapCtrl.cache.data));
            $scope.mapCtrl.geojson.data = $scope.mapCtrl.cache.data;
          });

          leafletData.getMap('incident').then(function(map) {
            console.log("registered click receiver");
            map.on('click', PostTripManualMarker.startAddingIncidentToPoints(map,
                $scope.mapCtrl.cache.points,
                $scope.mapCtrl.cache.features));
          });

        }
    });
  }

  $scope.refreshWholeMap = function() {
    $scope.refreshMap($scope.mapCtrl.start_ts, $scope.mapCtrl.end_ts);
  }

  $scope.getFormattedDate = DiaryHelper.getFormattedDate;
  $scope.getFormattedTime = DiaryHelper.getFormattedTime;
  $scope.refreshMap($scope.mapCtrl.start_ts, $scope.mapCtrl.end_ts);

  /* START: ng-walkthrough code */
  // Tour steps
  var tour = {
    config: {

    },
    steps: [{
      target: '#incident',
      content: 'Zoom in as much as possible to the location where the incident occurred and click on the blue line of the trip to mark a <font size="+3">&#x263B;</font> or <font size="+3">&#x2639;</font> incident'
    }]
  };

  var startWalkthrough = function () {
    nzTour.start(tour);
  };


  var checkIncidentTutorialDone = function () {
    var INCIDENT_DONE_KEY = 'incident_tutorial_done';
    var incidentTutorialDone = storage.get(INCIDENT_DONE_KEY);
    if (!incidentTutorialDone) {
      startWalkthrough();
      storage.set(INCIDENT_DONE_KEY, true);
    }
  };

  $scope.startWalkthrough = function () {
    startWalkthrough();
  }

  checkIncidentTutorialDone();
  /* END: ng-walkthrough code */
});
