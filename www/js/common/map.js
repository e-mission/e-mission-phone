angular.module('emission.main.common.map',['ionic-datepicker',
                                      'emission.main.common.services',
                                      'emission.services'])

.controller("CommonMapCtrl", function($window, $scope, $rootScope, $ionicPlatform, $state,
                                    CommonGraph, Config) {
  console.log("controller CommonMapCtrl called");

  var db = window.cordova.plugins.BEMUserCache;
  $scope.mapCtrl = {};

  angular.extend($scope.mapCtrl, {
    defaults : Config.getMapTiles()
  });

  var styleFeature = function(feature) {
    switch(feature.geometry.type) {
      case "Point":
        var place = CommonGraph.data.cPlaceId2ObjMap[feature.id];
        var popularity = place.places.length;
        var toReturn = {opacity: 0.3};
        return toReturn;
    };
  };

  var onEachFeature = function(feature, layer) {
    console.log("onEachFeature called with "+JSON.stringify(feature));
    console.log("type is "+feature.geometry.type);
    var popupContent = "<p>I started out as a GeoJSON " +
                    feature.geometry.type + ", but now I'm a Leaflet vector!</p>";
    console.log(popupContent);
    layer.on('click', layer.bindPopup("layer clicked"));
    console.log("Finished registering for onClick for feature "+feature.id)
  };

  var pointFormat = function(feature, latlng) {
    switch(feature.geometry.type) {
      case "Point": return L.marker(latlng, {opacity: 0.3});
      default: alert("Found unknown type in feature"  + feature); return L.marker(latlng)
    }
  };


  $scope.refreshMap = function() {
      CommonGraph.updateCurrent();
  };

  $scope.$on(CommonGraph.UPDATE_DONE, function(event, args) {
    $scope.$apply(function() {
        $scope.mapCtrl.geojson = {}
        $scope.mapCtrl.geojson.data = CommonGraph.data.geojson;
        $scope.mapCtrl.geojson.style = styleFeature;
        $scope.mapCtrl.geojson.onEachFeature = onEachFeature;
        // $scope.mapCtrl.geojson.pointToLayer = pointFormat;
    });
  });

  $scope.refreshMap();

  // TODO: Refactor into common code - maybe a service?
  // Or maybe pre-populate from the server

  /*
  $scope.getDisplayName = function(place_feature) {
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
       place_feature.properties.displayName = name;
    };


    var url = "http://nominatim.openstreetmap.org/reverse?format=json&lat=" + place_feature.geometry.coordinates[1]
        + "&lon=" + place_feature.geometry.coordinates[0];
      console.log("About to make call "+url);
      $http.get(url).then(function(response) {
             console.log("while reading data from nominatim, status = "+response.status
                 +" data = "+JSON.stringify(response.data));
             responseListener(response.data);
          }, function(response) {
             console.log("while reading data from nominatim, status = "+response.status);
             notFoundFn(day, response);
          });
  };
  */

});
