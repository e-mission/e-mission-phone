 angular.module('emission.main.diary.current', ['ui-leaflet',
                                                'ngCordova', 
                                                'emission.services', 
                                                'ionic'])

.controller('CurrMapCtrl', function($scope, Config, $state, $timeout, $ionicActionSheet,leafletData, Logger, $window) {
    
  console.log("controller CurrMapCtrl called from current.js");
  var db = window.cordova.plugins.BEMUserCache;
  MANUAL_INCIDENT = "manual/incident";
  BACKGROUND_LOCATION = "background/location";
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

  var date = new Date();
  var time = date.toTimeString().split(' ')[0].split(':');

  var startTimeFn = function(ts) {
    var date = new Date(ts*1000);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var amOrPm = hours < 12 ? 'AM' : 'PM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0'+ minutes : minutes;
    $scope.startTime = hours + ':' + minutes + ' ' + amOrPm;
  };

  var msToMph = function(ms) {
    var cmPerM = 100;
    var inchPerCm = 1/2.54;
    var footPerInch = 1/12;
    var milePerFoot = 1/5280;
    var secPerMin = 60;
    var minPerHour = 60;
    $scope.currSpeedInMph = Math.round(ms*cmPerM*inchPerCm*footPerInch*
                            milePerFoot*secPerMin*minPerHour);
  };

  var degreeToDirection = function(degree) {
    var index = Math.floor((degree / 45) + 0.5) % 8;
    $scope.currentDirection = directions[index];
  };

  var refreshTrip = function() {
    leafletData.getMap('current').then(function(map) {
      return db.getAllSensorData(BACKGROUND_LOCATION);
    }).then(function(result) {
      console.log(result);
      var coordinates = result.map(function(locWrapper, index, locList) {
        return [locWrapper.data.longitude, locWrapper.data.latitude];
      });
      var both = [result[0].data.longitude, result[0].data.latitude];
      var bearing = Math.round(result[0].data.bearing);
      console.log(bearing);
      startTimeFn(result[result.length - 1].data.ts);
      msToMph(result[0].data.sensed_speed);
      degreeToDirection(bearing);
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
              iconUrl: 'img/test.gif',
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
   
  var addSafe = function(marker, ts, map) {
      marker.setStyle({color: 'green'});
      map.addLayer(marker);
      addentry(marker,ts,0);
  };

  var addSuck = function(marker, ts, map) {
    marker.setStyle({color: 'red'});
    map.addLayer(marker);
    addentry(marker,ts,100);
  };

  var addentry = function(marker, ts, stressLevel) {
    var value = {
      loc: marker.toGeoJSON().geometry,
      ts: ts,
      stress: stressLevel
    };
    console.log("marker value", value);
    $window.cordova.plugins.BEMUserCache.putMessage(MANUAL_INCIDENT, value);
  };

  var getLocalIncidents = function() {
    var _map;
    leafletData.getMap('current').then(function(map) {
      _map = map;
      return db.getAllMessages(MANUAL_INCIDENT);
    }).then(function(incidents) {
      console.log("Incidents stored locally", incidents);
      incidents.forEach(function(incident) {
        console.log(incident);
        latlng = {
            lat: incident.data.loc.coordinates[1],
            lng: incident.data.loc.coordinates[0]
        };
        var marker = L.circleMarker(latlng);
        if(incident.data.stress == 100) {
          marker.setStyle({color: 'red'});
        } else {
          marker.setStyle({color: 'green'});
        }
        _map.addLayer(marker);
      });  
    });
  };

  var cancelTempEntry = function(marker, ts, map) {
    map.removeLayer(marker);
  };

  var addmarker = function(map, ts, llng) {
      console.log("both", llng);      
      console.log("called addmarker with map = "+map);
      var latlng = L.latLng(llng);
      var m = L.circleMarker(latlng);
      var safe_suck_cancel_actions = [{text: "<font size='+5'>&#x263B;</font>",
                                     action: addSafe},
                                    {text: "<font size='+5'>&#x2639;</font>",
                                     action: addSuck},
                                    {text: "Cancel",
                                     action: cancelTempEntry}];
    Logger.log("About to call ionicActionSheet.show");
    $ionicActionSheet.show({titleText: "lat: "+latlng.lat.toFixed(6)+
              ", lng: " + latlng.lng.toFixed(6),
          cancel: function() {
            cancelTempEntry(m, ts, map);
          },
          buttons: safe_suck_cancel_actions,
          buttonClicked: function(index, button) {
            button.action(m, ts, map);
            Logger.log("Clicked button "+button.text+" at index "+index);
            return true;
          }
    });
      
  };
  
  $scope.parse = function() {
    console.log("About to get map"); 
    var _map;
    leafletData.getMap('current').then(function(map) {
      console.log("success, got map "+ map);
      _map = map;
      return db.getAllSensorData(BACKGROUND_LOCATION);
    }).then(function(result) {
            both = [result[0].data.latitude, result[0].data.longitude];
            var ts = result[0].data.ts;
            addmarker(_map, ts, both);
    })
    .catch(function(error) {
      console.log("error while getting map current from leafletData");
    });
  };

  var mapRunning;
  var realTimeReload = function() {
    refreshTrip();
    mapRunning = setTimeout(realTimeReload, 1000);
  };

  $scope.$on('$ionicView.enter', function() {
    realTimeReload();
  });

  $scope.$on('$ionicView.leave', function() {
    clearTimeout(mapRunning);
  });

  getLocalIncidents();

});
