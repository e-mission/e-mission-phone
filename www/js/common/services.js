'use strict';

angular.module('emission.main.common.services', [])

.factory('CommonGraph', function($rootScope, $http) {
    var commonGraph = {};
    commonGraph.data = {};
    commonGraph.UPDATE_DONE = "COMMON_GRAPH_UPDATE_DONE";

    var db = window.cordova.plugins.BEMUserCache;
    var selKey = "common-trips";

    commonGraph.updateCurrent = function() {
      db.getDocument(selKey, function(entryList) {
        try{
            var cmGraph = JSON.parse(entryList);
        } catch(err) {
            window.Logger.log("Error "+err+" while parsing common trip data");
            // If there was an error in parsing the current common trips, and
            // there is no existing cached common trips, we create a blank
            // version so that other things don't crash
            if (angular.isUndefined(cmGraph)) {
                cmGraph = {
                    'user_id': 'unknown',
                    'common_trips': [],
                    'common_places': []
                }
            }
        }
        commonGraph.data.graph = cmGraph;
        postProcessData();
        toGeojson();
        $rootScope.$broadcast(commonGraph.UPDATE_DONE, {'from': 'broadcast', 'status': 'success'});
      }, function(error) {
        $rootScope.$broadcast(commonGraph.UPDATE_DONE, {'from': 'broadcast', 'status': 'error'});
      });
    };

    /*
     * Returns the common trip corresponding to the specified tripId
     */
    commonGraph.findCommon = function(tripId) {
        return commonGraph.data.tripMap[tripId];
    };

    /*
     * Returns the number of trips mapped to the specified commonTripId
     */
    commonGraph.getCount = function(cTripId) {
        return commonGraph.data.cTripCountMap[cTripId];
    };

    var postProcessData = function() {
        // Count the number of trips in each common trip. Also, create a map
        // from the trip list to the trip for efficient lookup
        commonGraph.data.cTripCountMap = {};
        commonGraph.data.trip2CommonMap = {};
        commonGraph.data.cTripId2ObjMap = {};
        commonGraph.data.graph.common_trips.forEach(function(cTrip, index, array) {
            commonGraph.data.cTripCountMap[cTrip._id.$oid] = cTrip.trips.length;
            commonGraph.data.cTripId2ObjMap[cTrip._id.$oid] = cTrip;
            cTrip.trips.forEach(function(tripId,index,array) {
                commonGraph.data.trip2CommonMap[tripId.$oid] = cTrip;
            });
        });
        commonGraph.data.cPlaceCountMap = {};
        commonGraph.data.place2CommonMap = {};
        commonGraph.data.cPlaceId2ObjMap = {};
        commonGraph.data.graph.common_places.forEach(function(cPlace, index, array) {
            commonGraph.data.cPlaceCountMap[cPlace._id.$oid] = cPlace.places.length;
            commonGraph.data.cPlaceId2ObjMap[cPlace._id.$oid] = cPlace;
            if (angular.isDefined(cPlace.displayName)) {
              console.log("For place "+cPlace.id+", already have displayName "+cPlace.displayName);
            } else {
              console.log("Don't have display name for end place, going to query nominatim");
              getDisplayName(cPlace);
            }
            cPlace.places.forEach(function(placeId,index,array) {
                commonGraph.data.place2CommonMap[placeId.$oid] = cPlace;
            });
        });
        commonGraph.data.graph.common_places.forEach(function(cPlace, index, array) {
          cPlace.succ_places = cPlace.successors.map(function(succId, index, array) {
            // succId is currently an object
            return commonGraph.data.cPlaceId2ObjMap[succId._id.$oid];
          });
        });
    };

    var toGeojson = function() {
        var places = commonGraph.data.graph.common_places.map(function(place) {
            return {
                "type": "Feature",
                "id": place._id,
                "geometry": place.location,
                "properties": {
                    "successors": place.successors
                }
            };
        });
        // places.map($scope.getDisplayName);
        var trips = commonGraph.data.graph.common_trips.map(function(trip) {
            return {
                "type": "Feature",
                "id": trip._id,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [trip.start_loc.coordinates, trip.end_loc.coordinates]
                },
                "properties": {
                    "probabilities": trip.probabilites
                }
            };
        });
        commonGraph.data.geojson = {
          "type": "FeatureCollection",
          "features": places.concat(trips)
        };
    };

    var getDisplayName = function(common_place) {
      var responseListener = function(data) {
        var address = data["address"];
        var name = "";
        if (address["road"]) {
          name = address["road"];
        } else if (address["neighbourhood"]) {
          name = address["neighbourhood"];
        }
        if (address["city"]) {
          name = name + ", " + address["city"];
        } else if (address["town"]) {
          name = name + ", " + address["town"];
        } else if (address["county"]) {
          name = name + ", " + address["county"];
        }

        console.log("got response, setting display name to "+name);
        common_place.displayName = name;
      };

      var url = "http://nominatim.openstreetmap.org/reverse?format=json&lat=" + common_place.location.coordinates[1]
      + "&lon=" + common_place.location.coordinates[0];
      console.log("About to make call "+url);
      $http.get(url).then(function(response) {
        console.log("while reading data from nominatim, status = "+response.status
          +" data = "+JSON.stringify(response.data));
        responseListener(response.data);
      }, function(error) {
        console.log("while reading data from nominatim, error = "+error);
      });
    };

    return commonGraph;
});
