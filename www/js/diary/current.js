 angular.module('emission.main.diary.current', ['ui-leaflet',
                                                'ngCordova', 
                                                'emission.services', 
                                                'ionic',
                                                'emission.incident.posttrip.manual',
                                                'rzModule',
                                                'angularLocalStorage'])

.controller('CurrMapCtrl', function($scope, Config, $state, $timeout, $ionicActionSheet,leafletData, 
                                    Logger, $window, PostTripManualMarker, CommHelper, $http, storage) {
    
  console.log("controller CurrMapCtrl called from current.js");
  var _map;
  var db = window.cordova.plugins.BEMUserCache;
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
            return "Yesterday";
          } else if (value === 7) {
            return "Week ago";
          }
        return "";
      }
    }
  };

  var incident_value = storage.get(INCIDENT_CONFIG);
  if(incident_value !== null) {
    $scope.verticalSlider.value = incident_value;
  } else {
    $scope.verticalSlider.value = 1;
  }

  var fromIncidentDate = moment().subtract($scope.verticalSlider.value, 'd');


  $scope.$watch('verticalSlider.value', function(newVal, oldVal){
    storage.set(INCIDENT_CONFIG, newVal);
    incidentServerCalldata.from_local_date = CommHelper.moment2Localdate(moment().subtract(newVal, 'd'));
  }, true);

  var incidentServerCalldata = {
      from_local_date: CommHelper.moment2Localdate(fromIncidentDate),
      to_local_date: CommHelper.moment2Localdate(moment()),
      sel_region: null
  };

  var startTimeFn = function(ts) {
    var date = new Date(ts*1000);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var amOrPm = hours < 12 ? 'AM' : 'PM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0'+ minutes : minutes;
    return hours + ':' + minutes + ' ' + amOrPm;
  };

  var getSpeed = function(curr_lglat, last_lglat, curr_ts, last_ts) {
    var curr_latlng = L.latLng(curr_lglat[1],curr_lglat[0]);
    var last_latlng = L.latLng(last_lglat[1],last_lglat[0]);
    var meters = curr_latlng.distanceTo(last_latlng);
    console.log("Distance To", meters);
    time = moment(curr_ts).diff(moment(last_ts));
    return Math.round(meters / time * 3.6); // mps to kmph
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
    db.getAllSensorData(BACKGROUND_LOCATION).then(function(result) {
      console.log(result);
      var coordinates = result.map(function(locWrapper, index, locList) {
        return [locWrapper.data.longitude, locWrapper.data.latitude];
      });
      var both = [result[0].data.longitude, result[0].data.latitude];
      var last_both = [result[1].data.longitude, result[1].data.latitude];
      var curr_ts = result[0].data.ts;
      var last_ts = result[1].data.ts;
      var bearing = Math.round(result[0].data.bearing);
      $scope.startTime = startTimeFn(result[result.length - 1].data.ts);
      //if(angular.isDefined(result[0].data.sensed_speed)){
        //$scope.currSpeedInKmh = Math.round(result[0].data.sensed_speed * 3.6); // mps to kmph
      //} else {
        // This speed is and average (not accurate) of current point and last point so it is not instantaneous rate of change
      $scope.currSpeedInKmh = getSpeed(both, last_both, curr_ts, last_ts);
      //}
      $scope.currentDirection = degreeToDirection(bearing);
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
              iconUrl: 'img/pacman.gif',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
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
    console.log($scope.mapCtrl);
  };

  $scope.$on('leafletDirectiveMap.current.resize', function(event, data) {
        console.log("current/map received resize event, invalidating map size");
        data.leafletObject.invalidateSize();
  });

  var addIncidentLayer = function(stress, marker, map) {
    if(stress === 0) {
      marker.setStyle({color: 'green'});
    } else if (stress === 100) {
      marker.setStyle({color: 'red'});
    } 
    map.addLayer(marker);
  };

  var addIncidents = function(incidents, _map) {
    incidents.forEach(function(incident) {
        console.log(incident);
        latlng = {
            lat: incident.data.loc.coordinates[1],
            lng: incident.data.loc.coordinates[0]
        };
        var marker = L.circleMarker(latlng);
        addIncidentLayer(incident.data.stress, marker, _map);
      });  
  };

  var getLocalIncidents = function() {
    db.getAllMessages(MANUAL_INCIDENT).then(function(incidents) {
      console.log("Incidents stored locally", incidents);
      addIncidents(incidents, _map);
    });
  };

  var getServerIncidents = function() {
      console.log(incidentServerCalldata);
      $http.post("https://e-mission.eecs.berkeley.edu/result/heatmap/incidents/local_date", incidentServerCalldata).then(function(res){
      console.log(res);
      if(res.data.incidents.length > 0) {
        addIncidents(res.data.incidents, _map);
      }
    }, function(error){
      console.log("Error when getting incidents");
      console.log(error);
    });
  };

  var marker;
  $scope.showIncidentSheet = function() {
    db.getAllSensorData(BACKGROUND_LOCATION).then(function(result) {
            both = [result[0].data.latitude, result[0].data.longitude];
            var ts = result[0].data.ts;
            var latlng = L.latLng(both);
            $scope.features = [];
            marker = L.circleMarker(latlng);
            console.log(marker);
            PostTripManualMarker.showSheet($scope.features, latlng, ts, marker, _map);
    })
    .catch(function(error) {
      console.log("error while getting map current from leafletData");
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
    mapRunning = setTimeout(refreshTripLoop, 1000); //refresh every second
  };

  var getIncidentsLoop = function() {
    getServerIncidents();
    gettingIncidents = setTimeout(getIncidentsLoop, 1000*60); //refresh every minute
  };

  $scope.$on('$ionicView.enter', function() {
      refreshTripLoop();
      getIncidentsLoop();
    });

    $scope.$on('$ionicView.leave', function() {
      clearTimeout(mapRunning);
      clearTimeout(gettingIncidents);
    });
    getLocalIncidents();

});
