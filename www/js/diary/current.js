 angular.module('emission.main.diary.current', ['ui-leaflet',
                                                'emission.services', 
                                                'ionic',
                                                'emission.incident.posttrip.manual',
                                                'rzModule',
                                                'emission.plugin.kvstore',
                                                'emission.plugin.logger'])

.controller('CurrMapCtrl', function($scope, Config, $state, $timeout, $ionicActionSheet,leafletData, 
                                    Logger, $window, PostTripManualMarker, CommHelper, KVStore, $ionicPlatform, $translate) {
    
  console.log("controller CurrMapCtrl called from current.js");
  var _map;
  var _localIncidentMarkers = [];
  var _serverIncidentMarkers = [];
  var db = function() {
    return window.cordova.plugins.BEMUserCache;
  }
  MANUAL_INCIDENT = "manual/incident";
  BACKGROUND_LOCATION = "background/location";
  INCIDENT_CONFIG = 'incident_config';
  $scope.mapCtrl = {}; 
  var directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]; 

  $scope.diary = function() {
    console.log('diary', "in diary");
    $state.go("root.main.diary");
  };   

  angular.extend($scope.mapCtrl, {
    defaults: {
    }
  });

  angular.extend($scope.mapCtrl.defaults, Config.getMapTiles());
  console.log("mapCtrl", $scope.mapCtrl);

  $scope.verticalSlider = {
    options: {
      floor:0,
      ceil: 7,
      vertical: true,
      showTicks: true,
      showSelectionBar: true,
      hideLimitLabels: true,
      translate: function(value) {
          if (value === 1) {
            return $translate.instant('diary.current-yesterday');
          } else if (value === 7) {
            return $translate.instant('diary.current-weekagos');
          }
        return "";
      }
    }
  };

  var loadSliderValue = function() {
      KVStore.get(INCIDENT_CONFIG).then(function(incident_value) {
      Logger.log("in current screen, read incident_value = "+incident_value);
      if(incident_value != null) {
        $scope.verticalSlider.value = incident_value;
      } else {
        $scope.verticalSlider.value = 1;
      }
      });
  }

  var fromIncidentDate = moment().subtract($scope.verticalSlider.value, 'd');


  $scope.$watch('verticalSlider.value', function(newVal, oldVal){
    $ionicPlatform.ready().then(function() {
    if (angular.isDefined(newVal) && !isNaN(newVal)) {
        KVStore.set(INCIDENT_CONFIG, newVal);
    }
    });
    incidentServerCalldata.start_time = CommHelper.moment2Timestamp(moment().subtract(newVal, 'd'));
  }, true);

  var incidentServerCalldata = {
      start_time: CommHelper.moment2Timestamp(fromIncidentDate),
      end_time: CommHelper.moment2Timestamp(moment()),
      sel_region: null
  };

  var startTimeFn = function (ts) {
    var date = new Date(ts * 1000);
    return moment(date).format("LT");
  };

  var getSpeed = function(curr_lglat, last_lglat, curr_ts, last_ts) {
    var curr_latlng = L.latLng(curr_lglat[1],curr_lglat[0]);
    var last_latlng = L.latLng(last_lglat[1],last_lglat[0]);
    var meters = curr_latlng.distanceTo(last_latlng);
    time = moment(curr_ts).diff(moment(last_ts));
    var speed = Math.round(meters / time * 3.6); // mps to kmph
    Logger.log("Current Speed: " + speed);
    return speed;
  };

  var degreeToDirection = function(degree) {
    var index = Math.floor((degree / 45) + 0.5) % 8;
    return directions[index];
  };

  leafletData.getMap('current').then(function(map) {
    _map = map;
    _map.removeControl(_map.zoomControl);
  });

  var refreshTrip = function() {
    db().getAllSensorData(BACKGROUND_LOCATION, true).then(function(result) {
      $scope.$apply(function() {
        Logger.log("current location data" + JSON.stringify(result[0].data));
        var coordinates = result.map(function(locWrapper, index, locList) {
          return [locWrapper.data.longitude, locWrapper.data.latitude];
        });
        var both = [result[0].data.longitude, result[0].data.latitude];
        $scope.startTime = startTimeFn(result[result.length - 1].data.ts);
        var bearing = Math.round(result[0].data.bearing);

        Logger.log("last location data " + JSON.stringify(result[1]));
        if (angular.isDefined(result[1])) {
            var last_both = [result[1].data.longitude, result[1].data.latitude];
            var curr_ts = result[0].data.ts;
            var last_ts = result[1].data.ts;
            var last_sensed_speed = result[0].data.sensed_speed;
            if(angular.isDefined(last_sensed_speed) && last_sensed_speed != 0) {
              $scope.currSpeedInKmh = Math.round(result[0].data.sensed_speed * 3.6);
            } else {
              if(curr_ts !== last_ts){
                $scope.currSpeedInKmh = getSpeed(both, last_both, curr_ts, last_ts);
              }
            }
            $scope.currentDirection = degreeToDirection(bearing);
        } else {
            Logger.log("last location is not defined, returning defaults");
            $scope.currSpeedInKmh = 0;
        }
        angular.extend($scope.mapCtrl, { 
          defaults : {
            center: {
              lat: both[1],
              lng: both[0],
              zoom: 15
            }
          },
          markers: {
            hereMarker: {
              lat: both[1],
              lng: both[0],
              icon: {
                iconUrl: 'img/ic_navigation_black_24dp.png',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, 0],
                shadowSize: [0, 0],
                shadowAnchor: [0, 0]
              },
              iconAngle: bearing,
            }
          },
          geojson: {
            data: [
              {
                type: "LineString",
                coordinates: coordinates
              },
            ],
          },
        });  
      });
    }).catch(function(error) {
        Logger.displayError("Error while loading location data", error);
    });
    console.log($scope.mapCtrl);
  };

  $scope.$on('leafletDirectiveMap.current.resize', function(event, data) {
        $ionicPlatform.ready().then(function() {
            Logger.log("current/map received resize event, invalidating map size");
            data.leafletObject.invalidateSize();
        });
  });

  var addIncidentLayer = function(stress, marker, map) {
    if(stress === 0) {
      marker.setStyle({color: 'green'});
    } else if (stress === 100) {
      marker.setStyle({color: 'red'});
    } 
    map.addLayer(marker);
  };

  var addIncidents = function(incidents, map, markerList) {
    incidents.forEach(function(incident) {
        Logger.log("Processing incident "+JSON.stringify(incident));
        if (angular.isDefined(incident) && angular.isDefined(incident.loc)) {
            latlng = {
                lat: incident.loc.coordinates[1],
                lng: incident.loc.coordinates[0]
            };
            Logger.log("Displaying incident report at "+JSON.stringify(latlng)+" on map");
            var marker = L.circleMarker(latlng);
            markerList.push(marker);
            addIncidentLayer(incident.stress, marker, map);
        }
      });  
  };

  var removeExistingIncidentMarkers = function(map, markerList) {
    markerList.forEach(function(marker) {
        map.removeLayer(marker);
        var remainingLayers = [];
        map.eachLayer(function(layer) {
            remainingLayers.push(layer);
        });
        Logger.log("After removing marker "+JSON.stringify(marker)+" new list size = "+remainingLayers.length);
    });
  };

  var getLocalIncidents = function() {
    // No metadata, to make it consistent with the server incidents
    db().getAllMessages(MANUAL_INCIDENT, false).then(function(incidents) {
      Logger.log("Incidents stored locally" + JSON.stringify(incidents));
      if(incidents.length > 0) {
        addIncidents(incidents, _map, _localIncidentMarkers);
      }
    });
  };

  var getServerIncidents = function() {
      Logger.log("Getting server incidents with call "+JSON.stringify(incidentServerCalldata));
      CommHelper.getAggregateData("result/heatmap/incidents/timestamp", incidentServerCalldata)
        .then(function(res){
          $scope.$apply(function() {
          Logger.log("Server incidents result is "+JSON.stringify(res));
          // Need to remove existing markers before adding new ones
          // https://github.com/e-mission/e-mission-phone/pull/263#issuecomment-322669042
          removeExistingIncidentMarkers(_map, _serverIncidentMarkers);
          _serverIncidentMarkers = [];
          if(res.data.incidents.length > 0) {
            addIncidents(res.incidents, _map, _serverIncidentMarkers);
          }
          });
      }, function(error){
          Logger.log("Error when getting incidents");
          Logger.log(JSON.stringify(error));
    });
  };

  var marker;
  $scope.showIncidentSheet = function() {
    db().getAllSensorData(BACKGROUND_LOCATION, true).then(function(result) {
            both = [result[0].data.latitude, result[0].data.longitude];
            var ts = result[0].data.ts;
            var latlng = L.latLng(both);
            $scope.features = [];
            marker = L.circleMarker(latlng);
            Logger.log(marker);
            PostTripManualMarker.showSheet($scope.features, latlng, ts, marker, _map);
    })
    .catch(function(error) {
      Logger.displayError("Error while getting selected map location ", error);
    });
  };

  $scope.$watch('features', function(newVal, oldVal){
    if(angular.isDefined(newVal)) {
      if(newVal.length === 1) {
        addIncidentLayer(newVal[0].properties.stress, marker, _map);
      }
    }
  }, true);

  var mapRunning;
  var gettingIncidents;
  var refreshTripLoop = function() {
    refreshTrip();
    mapRunning = setTimeout(refreshTripLoop, 30 * 1000); //refresh every 30 secs
    // on android, we read the location points every 30 secs by default
  };

  var getIncidentsLoop = function() {
    getServerIncidents();
    gettingIncidents = setTimeout(getIncidentsLoop, 5 * 60 * 1000); //refresh 5 minutes
    // refreshing more frequently would put a big load on the server
  };

  $scope.$on('$ionicView.enter', function() {
    $ionicPlatform.ready().then(function() {
        Logger.log("entered current screen, starting incident refresh");
        loadSliderValue();
        refreshTripLoop();
        getIncidentsLoop();
    });
  });

  $scope.$on('$ionicView.leave', function() {
    Logger.log("exited current screen, stopping incident refresh");
    clearTimeout(mapRunning);
    clearTimeout(gettingIncidents);
  });

  $ionicPlatform.on("resume", function(event) {
    Logger.log("resumed current screen, starting incident refresh");
    refreshTripLoop();
    getIncidentsLoop();
  });

  $ionicPlatform.on("pause", function(event) {
    Logger.log("paused current screen, stopping incident refresh");
    clearTimeout(mapRunning);
    clearTimeout(gettingIncidents);
  }); 

  $ionicPlatform.ready().then(function() {
      Logger.log("ionicPlatform.ready in current screen, getting local incidents");
      getLocalIncidents();
  });
});
