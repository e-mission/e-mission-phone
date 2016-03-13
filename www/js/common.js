angular.module('emission.main.common',['ui-leaflet', 'nvd3ChartDirectives',
                                      'ionic-datepicker'])

.controller("CommonCtrl", function($window, $scope, $http, $ionicPlatform, $state,
                                    $ionicScrollDelegate, $ionicPopup,
                                    $ionicLoading,
                                    $ionicActionSheet,
                                    leafletData, CommHelper) {
  console.log("controller CommonCtrl called");

  var db = window.cordova.plugins.BEMUserCache;
  $scope.mapCtrl = {};
  $scope.mapCtrl.selKey = "common-trips";

  angular.extend($scope.mapCtrl, {
    defaults : {
      tileLayer: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      tileLayerOptions: {
          opacity: 0.9,
          detectRetina: true,
          reuseTiles: true,
      }
    }
  });

  $scope.refreshMap = function() {
      db.getDocument($scope.mapCtrl.selKey, function(entryList) {
        cmGraph = JSON.parse(entryList);
        var places = cmGraph.common_places.map(function(place) {
            return place.location;
        });
        var trips = cmGraph.common_trips.map(function(trip) {
            return {"type": "LineString",
                    "coordinates": [trip.start_loc.coordinates, trip.end_loc.coordinates]
            };
        });
        $scope.$apply(function() {
            $scope.mapCtrl.geojson = {}
            $scope.mapCtrl.geojson.data = {
              "type": "GeometryCollection",
              "geometries": places.concat(trips)
            };
            /*
            $scope.mapCtrl.geojson.data = {
              "type": "GeometryCollection",
              "geometries": [{"type": "Point", "coordinates": [-122.0928609, 37.3646179]},
                {"type": "Point", "coordinates": [-122.084232225, 37.40347188333333]},
                {"type": "Point", "coordinates": [-122.08689705, 37.38997087]},
                {"type": "Point", "coordinates": [-122.08470205, 37.391537025]}]
            };
            */
        });
      });
  };

  $scope.refreshMap();
});
