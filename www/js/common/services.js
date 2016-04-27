'use strict';

angular.module('emission.main.common.services', [])

.factory('CommonGraph', function($rootScope) {
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
        commonGraph.data.tripMap = {};
        commonGraph.data.graph.common_trips.forEach(function(cTrip, index, array) {
            commonGraph.data.cTripCountMap[cTrip.id] = cTrip.trips.length;
            cTrip.trips.forEach(function(tripId,index,array) {
                commonGraph.data.tripMap[tripId.$oid] = cTrip;
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

    return commonGraph;
});
