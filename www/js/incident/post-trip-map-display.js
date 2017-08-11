'use strict';
angular.module('emission.incident.posttrip.map', [
  'ui-leaflet', 'ng-walkthrough',
  'angularLocalStorage',
  'emission.services', 'emission.plugin.logger',
  'emission.main.diary.services',
  'emission.incident.posttrip.manual']).
  controller('PostTripMapCtrl', function ($scope, $window, $state,
                                          $stateParams, $ionicActionSheet,
                                          $ionicLoading,
                                          leafletData, leafletMapEvents, nzTour,
                                          storage,
                                          Logger, Timeline, DiaryHelper, Config,
                                          UnifiedDataLoader,
                                          PostTripManualMarker,
                                          $ionicSlideBoxDelegate, $ionicPopup) {
    Logger.log('controller PostTripMapDisplay called with params = ' +
      JSON.stringify($stateParams));
    $scope.mapCtrl = {};
    angular.extend($scope.mapCtrl, {
      defaults: {},
    });
    angular.extend($scope.mapCtrl.defaults, Config.getMapTiles());
    var LOC_KEY = 'background/filtered_location';

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

    $scope.refreshMap = function (start_ts, end_ts) {
      var db = $window.cordova.plugins.BEMUserCache;
      var tq = {
        key: 'write_ts',
        startTs: start_ts,
        endTs: end_ts,
      };
      $scope.mapCtrl.cache = {};
      $scope.mapCtrl.server = {};
      // Clear everything before we start loading new data
      $scope.mapCtrl.geojson = {};
      $scope.mapCtrl.geojson.pointToLayer = DiaryHelper.pointFormat;
      $scope.mapCtrl.geojson.data = {
        type: 'Point',
        coordinates: [-122, 37],
        properties: {
          feature_type: 'location',
        },
      };
      Logger.log('About to query buffer for ' + JSON.stringify(tq));
      $ionicLoading.show({
        template: 'Loading...',
      });
      UnifiedDataLoader.getUnifiedSensorDataForInterval(LOC_KEY, tq)
      // .then(PostTripManualMarker.addLatLng)
        .then(function (resultList) {
          Logger.log('Read data of length ' + resultList.length);
          $ionicLoading.show({
            template: 'Mapping ' + resultList.length + ' points',
          });
          if (resultList.length > 0) {
            // $scope.mapCtrl.cache.points = PostTripManualMarker.addLatLng(resultList);
            // $scope.mapCtrl.cache.points = resultList;
            // Logger.log("Finished adding latlng");
            var pointCoords = resultList.map(function (locEntry) {
              return [locEntry.data.longitude, locEntry.data.latitude];
            });
            var pointTimes = resultList.map(function (locEntry) {
              return locEntry.data.ts;
            });
            $scope.mapCtrl.cache.features = [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: pointCoords,
                  properties: {
                    times: pointTimes,
                  },
                },
              }];
            $scope.mapCtrl.cache.data = {
              type: 'FeatureCollection',
              features: $scope.mapCtrl.cache.features,
              properties: {
                start_ts: start_ts,
                end_ts: end_ts,
              },
            };

            Logger.log('About to get section points');
            var points = resultList.map(function (locEntry) {
              var coords = [locEntry.data.longitude, locEntry.data.latitude];
              // Logger.log("coords = "+coords);
              return {
                loc: coords,
                latlng: L.GeoJSON.coordsToLatLng(coords),
                ts: locEntry.data.ts,
              };
            });
            /*
            var points = PostTripManualMarker.addLatLng(resultList);
            */
            $scope.mapCtrl.cache.points = points;
            Logger.log('Finished getting section points');
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
            $scope.$apply(function () {
              // data is in the cache, so we can just load it from there
              // Logger.log("About to set geojson = "+JSON.stringify($scope.mapCtrl.cache.data));
              $scope.mapCtrl.geojson.data = $scope.mapCtrl.cache.data;
            });

          }
          $ionicLoading.hide();
        }).catch(function (error) {
        var errStr = JSON.stringify(error);
        $ionicLoading.hide();
        Logger.log(errStr);
        $ionicPopup.alert({
          title: 'Unable to retrieve data',
          template: errStr,
        });
      });
    };

    $scope.refreshWholeMap = function () {
      $scope.refreshMap($scope.mapCtrl.start_ts, $scope.mapCtrl.end_ts);
    };

    $scope.refreshTiles = function () {
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
          clickExit: true,
        },
      },
      steps: [
        {
          target: '#surveyQ',
          content: 'Scroll for more options',
        }],
    };

    var startWalkthrough = function () {
      nzTour.start(tour).then(function (result) {
        Logger.log('post trip mode walkthrough start completed, no error');
      }).catch(function (err) {
        Logger.log('post trip mode walkthrough start errored' + err);
      });
    };

    var checkIncidentTutorialDone = function () {
      var POST_TRIP_MODE_DONE_KEY = 'post_trip_mode_tutorial_done';
      var incidentTutorialDone = storage.get(POST_TRIP_MODE_DONE_KEY);
      if (!incidentTutorialDone) {
        startWalkthrough();
        storage.set(POST_TRIP_MODE_DONE_KEY, true);
      }
    };

    $scope.startWalkthrough = function () {
      startWalkthrough();
    };

    $scope.closeView = function () {
      $state.go('root.main.diary');
    };

    $scope.$on('$ionicView.afterEnter', function (ev) {
      // Workaround from
      // https://github.com/driftyco/ionic/issues/3433#issuecomment-195775629
      if (ev.targetScope !== $scope)
        return;
      checkIncidentTutorialDone();
    });
    /* END: ng-walkthrough code */

    var noSelectPopup = function () {
      var noSelectedPopup = $ionicPopup.alert({
        title: 'Selection Required',
        template: 'Please select an option to proceed.'
      });

      return noSelectedPopup;
    }

    $scope.curSlide = 0;
    $scope.nextSlide = function (response) {
      if (response == null) {
        return noSelectPopup();
      }

      $scope.curSlide += 1;
      $ionicSlideBoxDelegate.next();
    };

    $scope.doneSlide = function (response) {
      if (response == null) {
        return noSelectPopup();
      }

      var myPopup = $ionicPopup.alert({
        template: angular.toJson($scope.surveyQuestions, null, 4),
        title: 'Response',
      });

      myPopup.then(function(res) {
        console.log('Tapped!', res);
      });

      $scope.closeView();
    };

    $scope.disableSwipe = function () {
      $ionicSlideBoxDelegate.enableSlide(false);
    };

    $scope.surveyQuestions = [
      {
        title: 'How would you rate your trip?',
        options: [
          {text: 'Bad', value: 1},
          {text: 'OK', value: 2},
          {text: 'Good', value: 3},
          {text: 'Excellent', value: 4},
        ],
        response: null,
      },
      {
        title: 'Were you able to complete your trip exactly as the route showed in AccessMap?',
        options: [
          {text: 'Yes', value: 1},
          {text: 'No', value: 0},
        ],
        response: null,
      },
      {
        title: 'If yes, how difficult was your trip?',
        options: [
          {text: 'Not Applicable', value: 0},
          {text: 'Easy', value: 1},
          {text: 'Medium', value: 2},
          {text: 'Difficult', value: 3},
          {text: 'Very Difficult', value: 4},
        ],
        response: null,
      },
      {
        title: 'How would you rate the sidewalk quality along your trip?',
        options: [
          {text: 'Poor', value: 1},
          {text: 'OK', value: 2},
          {text: 'Good', value: 3},
          {text: 'Great', value: 4},
        ],
        response: null,
      },
      {
        title: 'Did you have obstacles along your trip that you didn’t anticipate?',
        options: [
          {text: 'Yes', value: 1},
          {text: 'No', value: 0},
        ],
        response: null,
      },
      {
        title: 'Were these obstacles in AccessMap?',
        options: [
          {text: 'Yes', value: 1},
          {text: 'No', value: 0},
        ],
        response: null,
      },
      {
        title: 'If no, would you like to add them?',
        options: [
          {text: 'Not Applicable', value: 2},
          {text: 'Yes', value: 1},
          {text: 'No', value: 0},
        ],
        response: null,
      },
    ];
  });
