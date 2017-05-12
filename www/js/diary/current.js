 angular.module('emission.main.current', ['ui-leaflet','ngCordova', 'emission.services', 'ionic'])


// console.log("using mapCtrl");


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

  // angular.extend($scope.mapCtrl.defaults, Config.getMapTiles());

  $scope.go = function() {db.getAllSensorData($scope.config.key_data_mapping.Locations.key).then(function(result) {
      both = [result[0].data.latitude, result[0].data.longitude];
      // resolvedData = both[0];
      // otherVar = both[1];
  //     angular.extend($scope.mapCtrl, {
  //     defaults : {
  //     center: {
  //       lat: result[0].data.latitude,
  //       lng:  result[0].data.longitude,
  //       zoom: 15
  //     }
  //   }
  // });
  //     angular.extend($scope.mapCtrl.defaults, Config.getMapTiles());
      // console.log("defaults", result[0].data);
      // console.log("defaults", result[0].data);
      // return result;
  });
  //   angular.extend($scope.mapCtrl, {
  //     defaults : {
  //     center: {
  //       lat: resolvedData,
  //       lng:  otherVar,
  //       zoom: 15
  //     }
  //   }
  // });
  }
  $scope.go();
  

  // }).then(function(res) {
  //     angular.extend($scope.mapCtrl, {
  //     defaults : {
  //     center: {
  //       lat: res[0].data.longitude,
  //       lng:  res[0].data.latitude,
  //       zoom: 15
  //     }
  //   }
  // });
  //       angular.extend($scope.mapCtrl.defaults, Config.getMapTiles());
  //       console.log("defaults", $scope.mapCtrl.defaults);
  // });

  
  
  // console.log("extending", true);
  // angular.extend($scope.mapCtrl, {
  // defaults : {
  //     center: {
  //       lat: both[0],
  //       lng:  both[1],
  //       zoom: 15
  //     }
  //   }
  // });

  // angular.extend($scope.mapCtrl.defaults, Config.getMapTiles());

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
     


    // $scope.start_ts = $stateParams.start_ts;
    // $scope.end_ts = $stateParams.end_ts;
    // $scope.refreshMap($scope.start_ts, $scope.end_ts);
  $scope.refreshMap();

//     $scope.back = function(){
//       // $location.path('../templates/main-recent.html');
//       // $rootScope.$viewHistory.backView = null;
//       //$ionicHistory.clearCache();
//       $state.go("^", null, { reload: true });
//       // $window.location.href = "/templates/main-recent.html";
// }

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

  $scope.runTrip(Timeline.data.currDayTrips);
  // $scope.func();

  // $scope.lat_long = function() {
  //   $scope.func();
  //   both = [latitude, longitude];
  // }
  // $scope.long = function() {
  //   $scope.func();
  //   return longitude;
  // }
  
  // var llong = L.latLng(both);
  // var marker = L.marker(llong);
  // marker.addto()

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
//   $scope.addfeature = function() {
//     // $scope.lat_long();
//     // var newFeature = L.GeoJSON.asFeature(both);
//     // newFeature.properties.feature_type = "incident";
//     var geojsonFeature = {
//     "type": "Feature",
//     "properties": {
//         "name": "incident",
//     },
//     "geometry": {
//         "type": "Point",
//         "coordinates": both
//     }
// }; 
// } 
   
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
  };

    $scope.addmarker = function(map) {
      console.log("both", both);
    //   db.getAllSensorData($scope.config.key_data_mapping.Locations.key).then(function(result) {
    //     both = [result[0].data.latitude, result[0].data.longitude];
    // });
      console.log("called addmarker with map = "+map);
      var latlng = L.latLng(both);
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
    leafletData.getMap('current').then(function(map) {
      console.log("success, got map "+map);
      $scope.addmarker(map);
    })
    .catch(function(error) {
      console.log("error while getting map current from leafletData");
    });
    // $scope.addfeature();
    // return _map;
  }
  
   
  
  // $scope.tofeature = function(both) {
  //   console.log("About to convert"+incident.loc);
  //   var newFeature = L.GeoJSON.asFeature(incident.loc);
  //   newFeature.properties = angular.copy(incident);
  //   delete newFeature.properties.loc;
  //   newFeature.properties.feature_type = "incident";
  //   return newFeature;
  // };


  // $scope.refresh(latitude, longitude);

 var MULTI_PASS_THRESHOLD = 90;
  var MANUAL_INCIDENT = "manual/incident";
  var DISTANCE_THRESHOLD = function() {
    if ($ionicPlatform.is("android")) {
      return 200;
    } else {
      return 50;
    }
  };
/*
   * EXTERNAL FUNCTION
   *
   * Converts the incident to a geojson feature.
   * Maybe we should do something similar for all entries (trip/section)
   * as well.
   */

  ptmm.toGeoJSONFeature = function(incident) {
    console.log("About to convert"+incident.loc);
    var newFeature = L.GeoJSON.asFeature(incident.loc);
    newFeature.properties = angular.copy(incident);
    delete newFeature.properties.loc;
    newFeature.properties.feature_type = "incident";
    return newFeature;
  };

var getSectionPoints = function(section) {
    Logger.log("Called getSection points with list of size "+section.geometry.coordinates.length);
    var mappedPoints = section.geometry.coordinates.map(function(currCoords, index) {
      Logger.log("About to map point"+ JSON.stringify(currCoords)+" at index "+index);
      var currMappedPoint = {loc: currCoords,
        latlng: L.GeoJSON.coordsToLatLng(currCoords),
        ts: section.properties.times[index]}
      if (index % 100 == 0) {
        Logger.log("Mapped point "+ JSON.stringify(currCoords)+" to "+currMappedPoint);
      }
      return currMappedPoint;
    });
    return mappedPoints;
  }

  ptmm.addLatLng = function(locEntryList) {
    Logger.log("called addLatLng with list of length "+locEntryList.length);
    var mappedPoints = locEntryList.map(function(currEntry) {
      var currMappedPoint = {loc: currEntry.data.loc,
        latlng: L.GeoJSON.coordsToLatLng(currEntry.data.loc),
        ts: currEntry.data.ts}
      // if (index % 100 == 0) {
        Logger.log("Mapped point "+ JSON.stringify(currEntry)+" to "+currMappedPoint);
      // }
      return currMappedPoint;
    });
    return mappedPoints;
  }
/*
   * INTERNAL FUNCTION, not part of factory
   *
   * Add a safe (green, stress = 0) entry.
   */

  var addSafeEntry = function(latlng, ts, marker, event, map) {
    // marker.setStyle({color: 'green'});
    return addEntry(MANUAL_INCIDENT, "green", latlng, ts, 0, marker)
  };

  /*
   * INTERNAL FUNCTION, not part of factory
   *
   * Add a suck (red, stress = 100) entry.
   */

  var addSuckEntry = function(latlng, ts, marker, event, map) {
    return addEntry(MANUAL_INCIDENT, "red", latlng, ts, 100, marker)
  };

  /*
   * INTERNAL FUNCTION, not part of factory
   *
   * Generic addEntry, called from both safe and suck
   */

  var addEntry = function(key, newcolor, latlng, ts, stressLevel, marker) {
    // marker.setStyle({color: newcolor});
    var value = {
        loc: marker.toGeoJSON().geometry,
        ts: ts,
        stress: stressLevel
    }
    $window.cordova.plugins.BEMUserCache.putMessage(key, value)
    return value;
  }

  var showSheet = function(featureArray, latlng, ts, marker, e, map) {
    /*
    var safe_suck_cancel_actions = [{text: "<i class='ion-heart icon-action'></i>",
                                     action: addSafeEntry},
                                    {text: "<i class='ion-heart-broken icon-action'></i>",
                                     action: addSuckEntry},
                                    {text: "Cancel",
                                     action: cancelTempEntry}]
                                     */
    Logger.log("About to show sheet for latlng = "+latlng+" ts = "+ ts);
    var safe_suck_cancel_actions = [{text: "<font size='+5'>&#x263B;</font>",
                                     action: addSafeEntry},
                                    {text: "<font size='+5'>&#x2639;</font>",
                                     action: addSuckEntry},
                                    {text: "Cancel",
                                     action: cancelTempEntry}]

    Logger.log("About to call ionicActionSheet.show");
    $ionicActionSheet.show({titleText: "lat: "+latlng.lat.toFixed(6)
              +", lng: " + latlng.lng.toFixed(6)
              + " at " + getFormattedTime(ts),
          // cancelText: 'Cancel',
          cancel: function() {
            cancelTempEntry(latlng, ts, marker, e, map);
          },
          buttons: safe_suck_cancel_actions,
          buttonClicked: function(index, button) {
              var newEntry = button.action(latlng, ts, marker, e, map);
              Logger.log("Clicked button "+button.text+" at index "+index);
              /*
               * The markers are now displayed using the trip geojson. If we only
               * store the incidents to the usercache and don't add it to the geojson
               * it will look like the incident is deleted until we refresh the trip
               * information by pulling to refresh. So let's add to the geojson as well.
               */
              if (button.text != "Cancel") {
                var newFeature = ptmm.toGeoJSONFeature(newEntry);
                featureArray.push(newFeature);
                // And one that is done, let's remove the temporary marker
                cancelTempEntry(latlng, ts, marker, e, map);
              }
              return true;
          }
    });
  }

   var cancelTempEntry = function(latlng, ts, marker, event, map) {
    map.removeLayer(marker);
  }


  /*
   * EXTERNAL FUNCTION, part of factory, bound to the map to report
   * an incident on the trip displayed in the map. Note that this is a function
   * that takes in the feature,
   * but it needs to return a curried function that takes in the event.
   */

  ptmm.startAddingIncidentToTrip = function(trip, map) {
      Logger.log("section "+trip.properties.start_fmt_time
                  + " -> "+trip.properties.end_fmt_time
                  + " bound incident addition ");
      var point = getAllPointsForTrip(trip);
      var featureArray = trip.features;
      return ptmm.startAddingIncidentToPoint(map, point, featureArray);
  }

  ptmm.startAddingIncidentToPoint = function(layer, point, geojsonFeatureArray) {
      // Logger.log("points "+getFormattedTime(allPoints[0].ts)
      //             + " -> "+getFormattedTime(allPoints[allPoints.length -1].ts)
      //             + " bound incident addition ");

      return function(e) {
          // Logger.log("points "+getFormattedTime(allPoints[0].ts)
          //             + " -> "+getFormattedTime(allPoints[allPoints.length -1].ts)
          //             + " received click event, adding stress popup at "
          //             + e.latlng);
          // if ($state.$current == "root.main.diary") {
          //   Logger.log("skipping incident addition in list view");
          //   return;
          // }
          var map = layer;
          if (!(layer instanceof L.Map)) {
            map = layer._map;
          }
          var latlng = e.latlng;
          var marker = L.circleMarker(latlng).addTo(map);

          // var sortedPoints = getClosestPoints(marker.toGeoJSON(), allPoints);
          // if (sortedPoints[0].selDistance > DISTANCE_THRESHOLD()) {
          //   Logger.log("skipping incident addition because closest distance "
          //     + sortedPoints[0].selDistance + " > DISTANCE_THRESHOLD " + DISTANCE_THRESHOLD());
          //   cancelTempEntry(latlng, ts, marker, e, map);
          //   return;
          // };
          // var closestPoints = sortedPoints.slice(0,10);
          // Logger.log("Closest 10 points are "+ closestPoints.map(JSON.stringify));

          var timeBins = getTimeBins(point);
          Logger.log("number of bins = " + timeBins.length);


          if (timeBins.length == 1) {
            // Common case: find the first item in the first time bin, no need to
            // prompt
            Logger.log("About to retrieve ts from first bin of "+timeBins);
            var ts = timeBins[0][0].ts;
            showSheet(geojsonFeatureArray, latlng, ts, marker, e, map);
          } else {
            // Uncommon case: multiple passes - get the closest point in each bin
            // Note that this may not be the point with the smallest time diff
            // e.g. if I am going to school and coming back, when sorted by time diff,
            // the points will be ordered from home to school on the way there and
            // from school to home on the way back. So if the incident happened
            // close to home, the second bin, sorted by time, will have the first
            // point as the point closest to school, not to home. We will need to
            // re-sort based on distance. Or we can just accept an error in the timestamp,
            // which will be a max of 5 * 30 secs = 2.5 minutes
            // Let's accept the error for now and fix later.
            // Example: 8:06 - 8:48 on 16 Nov on iPhone3, around 3pm on 16 Nov on
            Logger.log("About to retrieve first ts from each bin of "+timeBins);
            var tsOptions = timeBins.map(function(bin) {
              return bin[0].ts;
            });
            Logger.log("tsOptions = " + tsOptions);
            var timeSelActions = tsOptions.map(function(ts) {
              return {text: getFormattedTime(ts),
                      selValue: ts};
            });
            $ionicActionSheet.show({titleText: "Choose incident time",
              buttons: timeSelActions,
              buttonClicked: function(index, button) {
                var ts = button.selValue;
                showSheet(geojsonFeatureArray, latlng, ts, marker, e, map);
                return true;
              }
            });
          }
      };
  };

  var getFormattedTime = function(ts_sec) {
    return moment(ts_sec * 1000).format('LT');
  }

  /*
   * EXTERNAL FUNCTION, part of factory, bound to the section to report
   * an incident on it. Note that this is a function that takes in the feature,
   * but it needs to return a curried function that takes in the event.
   */
  ptmm.startAddingIncidentToSection = function(feature, layer) {
      Logger.log("section "+feature.properties.start_fmt_time
                  + " -> "+feature.properties.end_fmt_time
                  + " bound incident addition ");
      var point = window.cordova.plugins.BEMDataCollection.getLastSensedData;
      var trip = Timeline.getTrip(feature.properties.trip_id.$oid);
      var featureArray = trip.features;
      return ptmm.startAddingIncidentToPoint(layer, point, featureArray);
  }

  var getAllPointsForTrip = function(trip) {
    var allPoints = [];
    trip.sections.forEach(function(s) {
      Array.prototype.push.apply(allPoints, getSectionPoints(s));
    });
    return allPoints;
  }

  var filterAlreadyAdded = function(trip, incidentList) {
    var existingTs = trip.features.filter(function(currFeature) {
      return (currFeature.type == "Feature") &&
        (currFeature.properties.feature_type == "incident");
    }).map(function(currFeature) {
      return currFeature.properties.ts;
    });
    Logger.log("existing incident ts = "+existingTs
      +" with length "+existingTs.length);
    var retList = incidentList.filter(function(currFeature) {
      return existingTs.indexOf(currFeature.ts) == -1;
    });
    Logger.log("After filtering existing length went from = "
      +existingTs.length +" to "+retList.length);
    return retList;
  };

  var displayIncidents = function(trip, incidentList) {
    console.log("About to display " + incidentList.map(JSON.stringify));
    var mappedList = incidentList.map(ptmm.toGeoJSONFeature);
    Logger.log("After mapping, "+mappedList.map(JSON.stringify))
    mappedList.forEach(function(newFeature) {
      trip.features.push(newFeature);
    });
  };

  /*
   * EXTERNAL FUNCTION: part of factory, invoked to display incident details
   */

  ptmm.displayIncident = function(feature, layer) {
    return layer.bindPopup(""+getFormattedTime(feature.properties.ts));
  };

  /*
   * EXTERNAL FUNCTION: format the incident as a colored marker
   */

  ptmm.incidentMarker = function(feature, latlng) {
    var m = L.circleMarker(latlng);
    if (feature.properties.stress == 0) {
      m.setStyle({color: "green"});
    } else {
      m.setStyle({color: "red"});
    }
    return m;
  };

  // END: Displaying incidents

  return ptmm;

  var currentStart = 0;

    /* Let's keep a reference to the database for convenience */
  var db = window.cordova.plugins.BEMUserCache;

    $scope.config = {}
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
  $scope.config.keys = []
    for (key in $scope.config.key_data_mapping) {
        $scope.config.keys.push(key);
    }

    $scope.selected = {}
    $scope.selected.key = $scope.config.keys[0]

    $scope.changeSelection = function() {
        $ionicActionSheet.show({
            buttons: [
              { text: 'Locations' },
              { text: 'Motion Type' },
              { text: 'Transitions' },
            ],
            buttonClicked: function(index, button) {
              $scope.setSelected(button.text);
              return true;
            }
        });
    }
 $scope.setSelected = function(newVal) {
      $scope.selected.key = newVal;
      $scope.updateEntries();
    }

  $scope.updateEntries = function() {
    if (angular.isUndefined($scope.selected.key)) {
        usercacheFn = db.getAllMessages;
        usercacheKey = "statemachine/transition";
    } else {
        usercacheFn = $scope.config.key_data_mapping[$scope.selected.key]["fn"]
        usercacheKey = $scope.config.key_data_mapping[$scope.selected.key]["key"]
    }
    usercacheFn(usercacheKey).then(function(entryList) {
      $scope.entries = [];
      $scope.$apply(function() {
          for (i = 0; i < entryList.length; i++) {
            // $scope.entries.push({metadata: {write_ts: 1, write_fmt_time: "1"}, data: "1"})
            var currEntry = entryList[i];
            currEntry.metadata.write_fmt_time = moment.unix(currEntry.metadata.write_ts)
                                                    .tz(currEntry.metadata.time_zone)
                                                    .format("llll");
            currEntry.data = JSON.stringify(currEntry.data, null, 2);
            // window.Logger.log(window.Logger.LEVEL_DEBUG,
            //     "currEntry.data = "+currEntry.data);
            $scope.entries.push(currEntry);
          }
      })
      // This should really be within a try/catch/finally block
      $scope.$broadcast('scroll.refreshComplete');
    }, function(error) {
        $ionicPopup.alert({template: JSON.stringify(error)})
            .then(function(res) {console.log("finished showing alert");});
    })
  }

  $scope.updateEntries();
  


});







