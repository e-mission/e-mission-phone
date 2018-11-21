'use strict';
angular.module('emission.incident.posttrip.map',['ui-leaflet', 'ng-walkthrough',
                                      'angularLocalStorage',
                                      'emission.services', 'emission.plugin.logger',
                                      'emission.main.diary.services',
                                      'emission.incident.posttrip.manual'])

.controller("PostTripMapCtrl", function($scope, $window, $state,
                                        $stateParams, $ionicActionSheet, $ionicLoading,
                                        leafletData, leafletMapEvents, nzTour, storage,
                                        Logger, Timeline, DiaryHelper, Config,
                                        UnifiedDataLoader, PostTripManualMarker,
                                        $ionicSlideBoxDelegate, $ionicPopup) {
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
      template: 'Loading...'
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
        var errStr = JSON.stringify(error);
        $ionicLoading.hide();
        Logger.log(errStr);
        $ionicPopup.alert({
            title: "Unable to retrieve data",
            template: errStr
        });
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
    nzTour.start(tour).then(function(result) {
      Logger.log("list walkthrough start completed, no error");
    }).catch(function(err) {
      Logger.log("incident walkthrough start errored" + err);
    });
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

  $scope.closeView = function () {
    $state.go('root.main.control');
  }

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
        title: 'Answer Required',
        template: 'Please answer the current question before proceeding'
      });

      return noSelectedPopup;
    }

    $scope.curSlide = 0;
    $scope.nextSlide = function (response) {
      if (response === null || response === undefined) {
        return noSelectPopup();
      }

      var nextSlideOffset;
      switch ($scope.surveyQuestions[$scope.curSlide]['type']) {
        case 'single_choice':
          nextSlideOffset = $scope.surveyQuestions[$scope.curSlide]['options'][response]['nextSlideOffset'];
          break;
        case 'text_input':
          nextSlideOffset = 1;
          break;
        default:
          nextSlideOffset = 1;
      }

      if (nextSlideOffset < 0) {
        $scope.curSlide = $scope.surveyQuestions.length;
        $scope.doneSlide(response);
        return;
      }

      var targetSlide = $scope.curSlide + nextSlideOffset;
      while ($scope.curSlide < targetSlide) {
        $scope.curSlide += 1;
        $ionicSlideBoxDelegate.next();
      }
    };

    var saveSurvey = function(trip_start_ts, trip_end_ts, survey_content) {
      var value = {
        ts: new Date().getTime(),
        geo_trace: $scope.mapCtrl.cache.data,
        start_ts: trip_start_ts,
        end_ts: trip_end_ts,
        survey: survey_content
      }
      $window.cordova.plugins.BEMUserCache.putMessage('manual/survey', value);
      return value;
    }

    $scope.doneSlide = function (response) {
      if (response === null || response === undefined || response === "") {
        return noSelectPopup();
      }

      var survey_content = JSON.parse(angular.toJson($scope.surveyQuestions, null, 4));
      saveSurvey($scope.mapCtrl.start_ts,     // Trip start ts
        $scope.mapCtrl.end_ts,       // Trip end ts
        survey_content);

      var myPopup = $ionicPopup.alert({
        template: 'Thank you for your input!',
        title: 'Response saved',
      });
      myPopup.then(function(res) {
        Logger.log('Survey response saved to user cache: ' + JSON.stringify(survey_content, null, 4));
      });

      $scope.closeView();
    };

    $scope.disableSwipe = function () {
      $ionicSlideBoxDelegate.enableSlide(false);
    };

    // Note: nextSlideOffset: the offset to walk counting from current slide.
    //       For example, next slide is 1, jump one slide is 2, jump 2 slides is 3...
    //       -1 is a specially value, which would end the survey immediately.
    $scope.surveyQuestions = [
      {
        title: 'The non-motorized (walking/wheelchair/hover board, etc) portion of this trip was familiar to me',
        type: 'single_choice',
        options: [
          {text: 'No, it is new to me', value: 0, nextSlideOffset: -1},
          {text: 'Yes, I’ve taken this trip a number of times', value: 1, nextSlideOffset: 1},
          {text: 'Yes, this is a regular part of my travel (to work, home, grocery store, etc)', value: 2, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'I used a trip planner (routing application) to plan the non-motorized portion of my trip',
        type: 'single_choice',
        options: [
          {text: 'No, I didn’t plan my trip with a routing application', value: 0, nextSlideOffset: -1},
          {text: 'Yes, I used Google Directions or Apple Maps',          value: 1, nextSlideOffset: 1},
          {text: 'Yes, I used Google StreetView to visualize the route', value: 2, nextSlideOffset: 1},
          {text: 'Yes, I used AccessMap',                                value: 3, nextSlideOffset: 1},
          {text: 'Yes, I used a different routing algorithm', value: 4, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'I was able to complete the non-motorized part of this trip by following the exact route recommended by the trip planner',
        type: 'single_choice',
        options: [
          {text: 'Strongly disagree', value: 0, nextSlideOffset: -1},
          {text: 'Disagree', value: 1, nextSlideOffset: 1},
          {text: 'Neither agree nor disagree', value: 2, nextSlideOffset: 1},
          {text: 'Agree', value: 3, nextSlideOffset: 1},
          {text: 'Strongly agree', value: 4, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'I followed the non-motorized route suggested by the trip planner fairly closely',
        type: 'single_choice',
        options: [
          {text: 'False', value: 0, nextSlideOffset: 1},
          {text: 'True', value: 1, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'I was able to complete my rest of my trip exactly per the path displayed by the router',
        type: 'single_choice',
        options: [
          {text: 'Strongly disagree',          value: 0, nextSlideOffset: 1},
          {text: 'Disagree',                   value: 1, nextSlideOffset: 1},
          {text: 'Neither agree nor disagree', value: 2, nextSlideOffset: 1},
          {text: 'Agree',                      value: 3, nextSlideOffset: 1},
          {text: 'Strongly agree',             value: 4, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'I was with another person when I completed the non-motorized portion of this trip',
        type: 'single_choice',
        options: [
          {text: 'False', value: 0, nextSlideOffset: 1},
          {text: 'True', value: 1, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'I required help to complete the non-motorized portion of this trip',
        type: 'single_choice',
        options: [
          {text: 'False', value: 0, nextSlideOffset: 1},
          {text: 'True', value: 1, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'The non-motorized segment of my trip was not difficult',
        type: 'single_choice',
        options: [
          {text: 'Strongly disagree', value: 0, nextSlideOffset: 1},
          {text: 'Disagree', value: 1, nextSlideOffset: 1},
          {text: 'Neither agree nor disagree', value: 2, nextSlideOffset: 1},
          {text: 'Agree', value: 3, nextSlideOffset: 1},
          {text: 'Strongly agree', value: 4, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'I experienced difficulty during the walking segment of my trip due to',
        type: 'single_choice',
        options: [
          {text: 'Difficult infrastructure (ex: high hill or bad sidewalk condition)',          value: 0, nextSlideOffset: 1},
          {text: 'Misinformation (ex: not knowing there is not a ramp)',                   value: 1, nextSlideOffset: 1},
          {text: 'Difficult infrastructure AND misinformation', value: 2, nextSlideOffset: 1},
          {text: 'A temporary issue (ex: broken elevator or construction)',                      value: 3, nextSlideOffset: 1},
          {text: 'A different reason ',             value: 4, nextSlideOffset: 1},
          {text: 'No difficulty during this walking trip ',             value: 5, nextSlideOffset: 1}
        ],
        response: null,
      },
      {
        title: 'Overall, the non-motorized portion of this trip was pleasant',
        type: 'single_choice',
        options: [
          {text: 'Strongly disagree', value: 0, nextSlideOffset: 1},
          {text: 'Disagree', value: 1, nextSlideOffset: 1},
          {text: 'Neither agree nor disagree', value: 2, nextSlideOffset: 1},
          {text: 'Agree', value: 3, nextSlideOffset: 1},
          {text: 'Strongly agree', value: 4, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'The sidewalk quality along the non-motorized portion of this trip was good',
        type: 'single_choice',
        options: [
          {text: 'Strongly disagree', value: 0, nextSlideOffset: 1},
          {text: 'Disagree', value: 1, nextSlideOffset: 1},
          {text: 'Neither agree nor disagree', value: 2, nextSlideOffset: 1},
          {text: 'Agree', value: 3, nextSlideOffset: 1},
          {text: 'Strongly agree', value: 4, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'There were obstacles along the non-motorized part of this trip',
        type: 'single_choice',
        options: [
          {text: 'Strongly disagree', value: 0, nextSlideOffset: -1},
          {text: 'Disagree', value: 1, nextSlideOffset: 1},
          {text: 'Neither agree nor disagree', value: 2, nextSlideOffset: 1},
          {text: 'Agree', value: 3, nextSlideOffset: 1},
          {text: 'Strongly agree', value: 4, nextSlideOffset: 1}
        ],
        response: null
      },
      {
        title: 'The trip planner had information about ALL the obstacles I met during the non-motorized part of the trip',
        type: 'single_choice',
        options: [
          {text: 'Strongly disagree', value: 0, nextSlideOffset: 1},
          {text: 'Disagree', value: 1, nextSlideOffset: 1},
          {text: 'Neither agree nor disagree', value: 2, nextSlideOffset: 1},
          {text: 'Agree',                      value: 3, nextSlideOffset: 1},
          {text: 'Strongly agree',             value: 4, nextSlideOffset: -1},
          {text: 'Did not use trip planner',      value: 5, nextSlideOffset: -1}
        ],
        response: null
      },
      {
        title: 'The trip planner needs additional data that was not there about this trip',
        type: 'single_choice',
        options: [
          {text: 'Strongly disagree', value: 0, nextSlideOffset: -1},
          {text: 'Disagree', value: 1, nextSlideOffset: -1},
          {text: 'Neither agree nor disagree', value: 2, nextSlideOffset: -1},
          {text: 'Agree',                      value: 3, nextSlideOffset: -1},
          {text: 'Strongly agree',             value: 4, nextSlideOffset: -1},
          {text: 'Not Applicable',             value: 4, nextSlideOffset: -1}
        ],
        response: null
      },
      {
        title: 'I experienced an unpleasant incident during the non-motorized part of this trip that isn’t related to the sidewalk environment',
        type: 'single_choice',
        options: [
          {text: 'False', value: 0, nextSlideOffset: 1},
          {text: 'True', value: 1, nextSlideOffset: 1}
        ],
        response: null
      }
    ];
  });
