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
                                        UnifiedDataLoader, PostTripManualMarker, $ionicSlideBoxDelegate, $ionicPopup) {
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
        clickExit: true
      }
    },
    steps: [{
      target: '#mode_list',
      content: 'Scroll for more options'
    }]
  };

  var startWalkthrough = function () {
    nzTour.start(tour).then(function(result) {
      Logger.log("post trip mode walkthrough start completed, no error");
    }).catch(function(err) {
      Logger.log("post trip mode walkthrough start errored" + err);
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

   $scope.chosen = {mode:'',purpose:'',other:''};

   var checkOtherOption = function(choice) {
    if(choice == 'other_mode' || choice == 'other_purpose') {
      var text = choice == 'other_mode' ? "mode" : "purpose";
      $ionicPopup.show({title: "Please fill in the " + text + " not listed.",
        scope: $scope,
        template: '<input type = "text" ng-model = "chosen.other">',        
        buttons: [
            { text: 'Cancel',
              onTap: function(e) {
                $scope.chosen.mode = '';
                $scope.chosen.purpose = '';
              }
            }, {
               text: '<b>Save</b>',
               type: 'button-positive',
                  onTap: function(e) {
                     if (!$scope.chosen.other) {
                           e.preventDefault();
                     } else {
                        if(choice == 'other_mode') {
                          $scope.chosen.mode = $scope.chosen.other;
                          $scope.chosen.other = '';
                        } else {
                          $scope.chosen.purpose = $scope.chosen.other;
                          $scope.chosen.other = '';
                        }
                        return $scope.chosen.other;
                     }
                  }
            }
        ]
      });

    }
   };

  $scope.choosePurpose = function() {
    if($scope.chosen.purpose == "other_purpose"){
      checkOtherOption($scope.chosen.purpose);
    }
  };

  $scope.chooseMode = function (){
    if($scope.chosen.mode == "other_mode"){
      checkOtherOption($scope.chosen.mode);
    }
  };

  $scope.secondSlide = false;

  $scope.nextSlide = function() {
    if($scope.chosen.mode.length > 0){
      $scope.secondSlide = true;
      console.log($scope.chosen.mode);
      // store mode here
      $ionicSlideBoxDelegate.next();
    }
  };

  $scope.doneSlide = function() {
    if($scope.chosen.purpose.length > 0){
      console.log($scope.chosen.purpose);
      // store purpose here
      $scope.closeView();
    }
  };

  $scope.disableSwipe = function() {
   $ionicSlideBoxDelegate.enableSlide(false);
  };

  $scope.modeOptions = [
   {text:'Walk', value:'walk'},
   {text:'Bike',value:'bike'},
   {text:'Drove Alone',value:'drove_alone'},
   {text:'Shared Ride',value:'shared_ride'},
   {text:'Taxi/Uber/Lyft',value:'taxi'},
   {text:'Bus',value:'bus'},
   {text:'Train',value:'train'},
   {text:'Free Shuttle',value:'free_shuttle'},
   {text:'Other',value:'other_mode'}];

   $scope.purposeOptions = [
   {text:'Home', value:'home'},
   {text:'Work',value:'work'},
   {text:'School',value:'school'},
   {text:'Shopping',value:'shopping'},
   {text:'Meal',value:'meal'},
   {text:'Pick-up/Drop off',value:'pick_drop'},
   {text:'Personal/Medical',value:'personal_med'},
   {text:'Recreation/Exercise',value:'exercise'},
   {text:'Entertainment/Social',value:'entertainment'},
   {text:'Religious', value:'religious'},
   {text:'Other',value:'other_purpose'}];

});
