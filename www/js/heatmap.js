'use strict';

angular.module('emission.main.heatmap',['ui-leaflet', 'emission.services'])

.controller('HeatmapCtrl', function($scope, $ionicLoading, $ionicActionSheet, $http, leafletData, Config) {
  $scope.mapCtrl = {};

  angular.extend($scope.mapCtrl, {
    defaults : {
      center: {
        lat: 37.87269,
        lng: -122.25921,
        zoom: 15
      }
    }
  });

  angular.extend($scope.mapCtrl.defaults, Config.getMapTiles())

  $scope.getPopRoute = function() {
    $ionicLoading.show({
        template: 'Loading...'
      });
    var data = {
      modes: $scope.selectCtrl.modes,
      from_local_date: $scope.selectCtrl.fromDate,
      to_local_date: $scope.selectCtrl.toDate,
      sel_region: null
    };
    console.log("Sending data "+JSON.stringify(data));
    $http.post("https://e-mission.eecs.berkeley.edu/result/heatmap/pop.route", data)
    .then(function(response) {
      $ionicLoading.hide();
      if (angular.isDefined(response.data.lnglat)) {
        console.log("Got points in heatmap "+response.data.lnglat.length);
        $scope.showHeatmap(response.data.lnglat);
      } else {
        console.log("did not find latlng in response data "+JSON.stringify(response.data));
      }
    }, function(error) {
      $ionicLoading.hide();
      console.log("Got error %s while trying to read heatmap data" +
        JSON.stringify(error));
    });
  };

  $scope.showHeatmap = function(lnglat) {
    leafletData.getMap('heatmap').then(function(map){
      var boundsGeojson = L.geoJson();
      lnglat.forEach(function(cval, i, array) {
        boundsGeojson.addData({'type': 'Point', 'coordinates': cval});
      });
      var bounds = L.featureGroup([boundsGeojson]).getBounds();
      console.log("geojson bounds="+JSON.stringify(bounds));

      var latlng = lnglat.map(function(cval, i, array){
        return cval.reverse();
      });
      if (angular.isUndefined($scope.heatLayer)) {
        console.log("no existing heatLayer found, skipping remove...");
      } else {
        map.removeLayer($scope.heatLayer);
      }
      $scope.heatLayer = L.heatLayer(latlng).addTo(map);
      map.fitBounds(bounds);
    });
  }

  $scope.modeOptions = [
      {text: "ALL", value:null},
      {text: "NONE", value:[]},
      {text: "BICYCLING", value:["BICYCLING"]},
      {text: "WALKING", value:["WALKING", "ON_FOOT"]},
      {text: "IN_VEHICLE", value:["IN_VEHICLE"]}
    ];

  $scope.changeMode = function() {
    $ionicActionSheet.show({
      buttons: $scope.modeOptions,
      titleText: "Select travel mode",
      cancelText: "Cancel",
      buttonClicked: function(index, button) {
        $scope.selectCtrl.modeString = button.text;
        $scope.selectCtrl.modes = button.value;
        return true;
      }
    });
  };

  $scope.changeFromWeekday = function() {
    return $scope.changeWeekday(function(newVal) {
                                  $scope.selectCtrl.fromDateWeekdayString = newVal;
                                },
                                $scope.selectCtrl.fromDate);
  }

  $scope.changeToWeekday = function() {
    return $scope.changeWeekday(function(newVal) {
                                  $scope.selectCtrl.toDateWeekdayString = newVal;
                                },
                                $scope.selectCtrl.toDate);
  }

  $scope.changeWeekday = function(stringSetFunction, localDateObj) {
    var weekdayOptions = [
      {text: "All", value: null},
      {text: "Monday", value: 0},
      {text: "Tuesday", value: 1},
      {text: "Wednesday", value: 2},
      {text: "Thursday", value: 3},
      {text: "Friday", value: 4},
      {text: "Saturday", value: 5},
      {text: "Sunday", value: 6}
    ];
    $ionicActionSheet.show({
      buttons: weekdayOptions,
      titleText: "Select day of the week",
      cancelText: "Cancel",
      buttonClicked: function(index, button) {
        stringSetFunction(button.text);
        localDateObj.weekday = button.value;
        return true;
      }
    });
  };


  /*
   * This is very heavily tied to the current mode options.
   * Change when we change this
   */
  $scope.displayMode = function() {
    for (var i in $scope.modeOptions) {
      var modeMapping = $scope.modeOptions[i];
      // this is the ALL case
      if (i == 0 && $scope.selectCtrl.modes == null) {
        return modeMapping.text;
      }
      // this is the NONE case
      if (i == 1 && $scope.selectCtrl.modes == []) {
        return modeMapping.text;
      }
      // TODO: Right now, we have single element arrays. Change this if we want
      // a different representation
      if (i > 1 && $scope.selectCtrl.modes != null && $scope.selectCtrl.modes.length > 0
          && (modeMapping.value[0] == $scope.selectCtrl.modes[0])) {
        return modeMapping.text;
      }
    }
    return "unknown";
  }

  var initSelect = function() {
    var now = moment();
    var dayago = moment().subtract(1, 'd');
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
      month: momentObj.month() + 1,
      day: momentObj.date() - 1,
      hour: momentObj.hour()
    };
  }

  $scope.selectCtrl = {}
  initSelect();
})
