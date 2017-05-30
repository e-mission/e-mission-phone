 angular.module('emission.main.current', ['ui-leaflet','ngCordova', 'emission.services', 'ionic'])


// console.log("using mapCtrl");

.factory('Incidents', function($scope, $ionicLoading, $ionicActionSheet, $http,
        leafletData, Logger, Config, PostTripManualMarker,
        $window, nzTour, storage) {
  var incidents = {};
  incidents.data = {};


})
.controller('CurrMapCtrl', function($scope, Config, $ionicHistory, $state, $rootScope, $timeout, $ionicLoading, $ionicActionSheet, $http,
        leafletData, $stateParams, $ionicPlatform, $ionicScrollDelegate, $location, $ionicPopup, Logger, PostTripManualMarker,
        $window, nzTour, Timeline, CommonGraph, storage, ionicDatePicker, DiaryHelper, StartPrefs, ControlHelper, UpdateCheck) {
    /* Let's keep a reference to the database for convenience */
    
    console.log("controller mapCtrl called from current.js");
    var db = window.cordova.plugins.BEMUserCache;
    $scope.mapCtrl = {};
    $scope.mapCtrl.selKey = "background/location";
    var ptmm = {};
    $scope.config = {}
    $scope.tripId = $stateParams.tripId;
    $scope.config.key_data_mapping = {
      "Transitions": {
          fn: db.getAllMessages,
          key: "statemachine/transition"
      },
      "Locations": {
          fn: db.getAllSensorData,
          key: "background/location"
      },
      "Motion Type": {
          fn: db.getAllSensorData,
          key: "background/motion_activity"
      },
  }
    $scope.diary = function() {
    console.log('diary', "in diary");
    $state.go("root.main.diary");
}    
   console.log("defaults", $scope.mapCtrl.defaults);

    angular.extend($scope.mapCtrl, {
    defaults : {
      center: {
        lat: 37.87269,
        lng: -122.25921,
        zoom: 15
      }
    }
  });

  angular.extend($scope.mapCtrl.defaults, Config.getMapTiles());

  var date = new Date();
  var time = date.toTimeString().split(' ')[0].split(':');
  var longitude;
  var latitude;
  var both;

  $scope.getdate = function() {
     return time[0]+':'+time[1];
  }

  $scope.refresh = function() {
    angular.extend($scope.mapCtrl, { 
    defaults : {
      center: {
        lat: both[0],
        lng: both[1],
        zoom: 15
      }
    }
  });
    angular.extend($scope.mapCtrl.defaults, Config.getMapTiles());
  }

  
  var resolvedData;
  var otherVar;


  $scope.go = function() {db.getAllSensorData($scope.config.key_data_mapping.Locations.key).then(function(result) {
      both = [result[0].data.latitude, result[0].data.longitude];
      $scope.refresh();
  });
  }
  $scope.go();
  

  $scope.$on('leafletDirectiveMap.resize', function(event, data) {
          console.log("current/map received resize event, invalidating map size");
          data.leafletObject.invalidateSize();
  });

  $scope.refreshMap = function() {
        db.getAllSensorData($scope.mapCtrl.selKey, function(entryList) {
            var coordinates = entryList.map(function(locWrapper, index, locList) {
                var parsedData = JSON.parse(locWrapper.data);
                 console.log("latitude", parsedData.latitude);
                return [parsedData.longitude, parsedData.latitude];
            });
            $scope.$apply(function() {
                $scope.mapCtrl.geojson = {};
                $scope.mapCtrl.geojson.data = {
                  "type": "LineString",
                  "coordinates": coordinates
                }
            });
        });
  };
     
  $scope.refreshMap();

  var currentStart = 0;

  /* Let's keep a reference to the database for convenience */
  var db = window.cordova.plugins.BEMUserCache;
  var readAndUpdateForDay = function(day) {
    // This just launches the update. The update can complete in the background
    // based on the time when the database finishes reading.
    // TODO: Convert the usercache calls into promises so that we don't have to
    // do this juggling
    Timeline.updateForDay(day);
    CommonGraph.updateCurrent();
  };
  readAndUpdateForDay(moment().startOf('day'));
  console.log("tripid", Timeline.data.currDayTrips);

  $scope.runTrip = function(trips) {
      if (trips.length != 0) {
          $scope.tripId = Timeline.getTrip(trips[trips.length - 1].id);
          $scope.trip = Timeline.getTrip($stateParams.tripId);
          $scope.tripgj = DiaryHelper.directiveForTrip($scope.trip); 
          $scope.start_place = tripgj.start_place.properties.displayName.split(',')[0];

      }
  };

  // $scope.runTrip(Timeline.data.currDayTrips);

  var initSelect = function() {
    var now = moment();
    var dayago = moment().subtract(30, 'd');
    $scope.selectCtrl.showStress = false;
    $scope.selectCtrl.showCount = true;
    $scope.selectCtrl.modes = null;
    $scope.selectCtrl.modeString = "ALL";
    $scope.selectCtrl.fromDate = moment2Localdate(dayago)
    $scope.selectCtrl.toDate = moment2Localdate(now);
    $scope.selectCtrl.fromDateWeekdayString = "All"
    $scope.selectCtrl.toDateWeekdayString = "All"
    $scope.selectCtrl.region = null;
  };

  var moment2Localdate = function(momentObj) {
    return {
      year: momentObj.year(),
      month: 4,
      day: "",
      hour: ""
    };
  }

  $scope.selectCtrl = {}
  initSelect();
  $scope.stressData = {};
  $scope.countData = {};

  $scope.getIncidents = function() {
    $scope.stressData.isLoading = true;
    var data = {
      modes: $scope.selectCtrl.modes,
      from_local_date: $scope.selectCtrl.fromDate,
      to_local_date: $scope.selectCtrl.toDate,
      sel_region: null
    };
    Logger.log("Sending data "+JSON.stringify(data));
    return $http.post("https://e-mission.eecs.berkeley.edu/result/heatmap/incidents/local_date", data)
    .then(function(response) {
      if (angular.isDefined(response.data.incidents)) {
        Logger.log("Got incidents"+response.data.incidents.length);
        $scope.showIncidents(response.data.incidents);
      } else {
        Logger.log("did not find incidents in response data "+JSON.stringify(response.data));
      }
      $scope.stressData.isLoading = false;
    }, function(error) {
      Logger.log("Got error %s while trying to read heatmap data" +
        JSON.stringify(error));
      $scope.stressData.isLoading = false;
    });
  };

  $scope.showIncidents = function(incidentEntries) {
    var incidentFeatureList = incidentEntries.map(PostTripManualMarker.toGeoJSONFeature);
    var incidentsGeojson = L.geoJson(null, {
      pointToLayer: PostTripManualMarker.incidentMarker,
      onEachFeature: PostTripManualMarker.displayIncident
    });
    incidentFeatureList.forEach(function(ival, i, array) {
      incidentsGeojson.addData(ival);
    });
    var bounds = L.featureGroup([incidentsGeojson]).getBounds();
    Logger.log("geojson bounds="+JSON.stringify(bounds));
    $scope.stressData.layer = incidentsGeojson;
    $scope.stressData.bounds = bounds;
    leafletData.getMap('current').then(function(map) {
      console.log("success, got map "+map);
      incidentsGeojson.addTo(map);
    })
    .catch(function(error) {
      console.log("error while getting map current from leafletData");
    });
    Logger.log("stress layer"+incidentFeatureList);

  }

  $scope.getIncidents();
  
  var _map;
   
  var addSafe = function(marker, map) {
      marker.setStyle({color: 'green'});
      map.addLayer(marker);
  };

  /*
   * INTERNAL FUNCTION, not part of factory
   *
   * Add a suck (red, stress = 100) entry.
   */

  var addSuck = function(marker, map) {
    marker.setStyle({color: 'red'});
    map.addLayer(marker);
    console.log("marker", marker);
  };

    $scope.addmarker = function(map, llng) {
      console.log("both", llng);
    //   db.getAllSensorData($scope.config.key_data_mapping.Locations.key).then(function(result) {
    //     both = [result[0].data.latitude, result[0].data.longitude];
    // });
      
      console.log("called addmarker with map = "+map);
      var latlng = L.latLng(llng);
      var m = L.circleMarker(latlng);
      var safe_suck_cancel_actions = [{text: "<font size='+5'>&#x263B;</font>",
                                     action: addSafe},
                                    {text: "<font size='+5'>&#x2639;</font>",
                                     action: addSuck},
                                    {text: "Cancel",
                                     action: cancelTempEntry}]
    Logger.log("About to call ionicActionSheet.show");
    $ionicActionSheet.show({titleText: "lat: "+latlng.lat.toFixed(6)
              +", lng: " + latlng.lng.toFixed(6),
          // cancelText: 'Cancel',
          cancel: function() {
            map.removeLayer(m);
          },
          buttons: safe_suck_cancel_actions,
          buttonClicked: function(index, button) {
              
        // m.setStyle({color: "red"});
      // marker.setStyle({color: newcolor});
              // m.addTo(map);
              var newEntry = button.action(m, map);
              Logger.log("Clicked button "+button.text+" at index "+index);
              /*
               * The markers are now displayed using the trip geojson. If we only
               * store the incidents to the usercache and don't add it to the geojson
               * it will look like the incident is deleted until we refresh the trip
               * information by pulling to refresh. So let's add to the geojson as well.
               */
              // if (button.text != "Cancel") {
              //   var newFeature = ptmm.toGeoJSONFeature(newEntry);
              //   featureArray.push(newFeature);
              //   // And one that is done, let's remove the temporary marker
              //   cancelTempEntry(latlng, ts, marker, e, map);
              // }
              return true;
          }
    });
      
  }
  
  
  $scope.parse = function() {
    console.log("About to get map"); 
    var _map;
    leafletData.getMap('current').then(function(map) {
      console.log("success, got map "+ map);
      _map = map;
      return db.getAllSensorData($scope.config.key_data_mapping.Locations.key);
    }).then(function(result) {
            both = [result[result.length - 1].data.latitude, result[result.length - 1].data.longitude];
            $scope.addmarker(_map, both);

    })
    .catch(function(error) {
      console.log("error while getting map current from leafletData");
    });
    // $scope.addfeature();
    // return _map;
  }
  
   





});







