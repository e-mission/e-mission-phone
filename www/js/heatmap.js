'use strict';

angular.module('emission.main.heatmap',['ui-leaflet', 'emission.services',
               'emission.plugin.logger', 'emission.incident.posttrip.manual',
               'ng-walkthrough', 'nzTour', 'emission.plugin.kvstore'])

.controller('HeatmapCtrl', function($scope, $ionicLoading, $ionicActionSheet, $http,
        leafletData, Logger, Config, PostTripManualMarker,
        $window, nzTour, KVStore) {
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

  $scope.$on('leafletDirectiveMap.heatmap.resize', function(event, data) {
      Logger.log("heatmap received resize event, invalidating map size");
      data.leafletObject.invalidateSize();
  });

  $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
  };

  /*
   * BEGIN: "regular" heatmap with trip "counts".
   * Hotter for more counts.
   */

  $scope.getPopRoute = function() {
    $scope.countData.isLoading = true;
    var data = {
      modes: $scope.selectCtrl.modes,
      from_local_date: $scope.selectCtrl.fromDate,
      to_local_date: $scope.selectCtrl.toDate,
      sel_region: null
    };
    Logger.log("Sending data "+JSON.stringify(data));
    return $http.post("https://e-mission.eecs.berkeley.edu/result/heatmap/pop.route/local_date", data)
    .then(function(response) {
      if (angular.isDefined(response.data.lnglat)) {
        Logger.log("Got points in heatmap "+response.data.lnglat.length);
        $scope.showHeatmap(response.data.lnglat);
      } else {
        Logger.log("did not find latlng in response data "+JSON.stringify(response.data));
      }
      $scope.countData.isLoading = false;
    }, function(error) {
      Logger.displayError("Error while trying to read heatmap data", error);
      $scope.countData.isLoading = false;
    });
  };

  $scope.showHeatmap = function(lnglat) {
    var boundsGeojson = L.geoJson();
    lnglat.forEach(function(cval, i, array) {
      boundsGeojson.addData({'type': 'Point', 'coordinates': cval});
    });
    var bounds = L.featureGroup([boundsGeojson]).getBounds();
    Logger.log("geojson bounds="+JSON.stringify(bounds));

    var latlng = lnglat.map(function(cval, i, array){
      return cval.reverse();
    });
    $scope.countData.layer = L.heatLayer(latlng);
    $scope.countData.bounds = bounds;
  }

  /*
   * END: "regular" heatmap with trip "counts".
   * Hotter for more counts.
   */

  /*
   * BEGIN: general controls
   */

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
      month: momentObj.month() + 1,
      day: momentObj.date() - 1,
      hour: momentObj.hour()
    };
  }

  $scope.mapHeight = $window.screen.height - 250;
  $scope.selectCtrl = {}
  initSelect();
  $scope.stressData = {};
  $scope.countData = {};

  /*
   * END: general controls
   */

  /*
   * BEGIN: Switching code
   */

  $scope.countButtonClass = function() {
    return $scope.selectCtrl.showCount? "metric-chart-button-active hvcenter" : "metric-chart-button hvcenter";
  }
  $scope.stressButtonClass = function() {
    return $scope.selectCtrl.showStress? "metric-summary-button-active hvcenter" : "metric-summary-button hvcenter";
  }

  $scope.showCounts = function() {
    $scope.selectCtrl.showStress = false;
    $scope.selectCtrl.showCount = true;
    $scope.switchSelData();
  }

  $scope.showStress = function() {
    $scope.selectCtrl.showCount = false;
    $scope.selectCtrl.showStress = true;
    $scope.switchSelData();
  }

  /*
   * selected value is of the form:
   * {
   *   layer:
   *   bounds:
   *   isLoading: // can be changed to progress later
   * }
   */

  var setSelData = function(map, selData) {
    if (selData.isLoading == true) {
      $ionicLoading.show({
          template: 'Loading...'
      });
      // Don't set any layer - it will be filled in when the load completes
    } else {
      $ionicLoading.hide();
      if (angular.isDefined(selData) && angular.isDefined(selData.layer)) {
        selData.layer.addTo(map);
        map.fitBounds(selData.bounds);
        $scope.selData = selData;
      }
    }
  }

  $scope.switchSelData = function() {
    leafletData.getMap('heatmap').then(function(map){
      if (angular.isUndefined($scope.selData)) {
        Logger.log("no existing data found, skipping remove...");
      } else {
        map.removeLayer($scope.selData.layer);
        $scope.selData = undefined;
      }
      if ($scope.selectCtrl.showStress == true) {
        setSelData(map, $scope.stressData);
      } else {
        setSelData(map, $scope.countData);
      }
    });
  };

  $scope.getHeatmaps = function() {
    $scope.getPopRoute().finally($scope.switchSelData);
    $scope.getIncidents().finally($scope.switchSelData);
  }

  /*
   * END: Switching code
   */

  /*
   * BEGIN: Stress map code
   */

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
      Logger.displayError("Error while trying to read stress data", error);
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
  }

  /*
   * END: Stress map code
   */

  /*
   * BEGIN: One-time init code.
   * Note that this is after all the other code to ensure that the functions are defined
   * before they are invoked.
   */

  $scope.getHeatmaps();
  $scope.switchSelData();

  /*
   * END: One-time init code
   */

  // Tour steps
  var tour = {
    config: {
      mask: {
        visibleOnNoTarget: true,
        clickExit: true
      }
    },
    steps: [{
      target: '.datepicker',
      content: 'This heatmap shows the aggregate data for all E-mission users. Select the dates you want to see, and filter by hours of the day (24h format) and days of the week. For example, if you enter 16 and 19 in the last field, and select Monday and Friday, you\'ll see the Heatmap filtered to show the traffic on weekdays between 4pm and 7pm.'
    },
    {
      target: '.heatmap-mode-button',
      content: 'Click here to filter your results by mode of transportation. The default is to show all modes.'
    },
    {
      target: '.heatmap-get-button',
      content: 'Click here to generate the heatmap.'
    }]
  };

  var startWalkthrough = function () {
    nzTour.start(tour).then(function(result) {
      Logger.log("heatmap walkthrough start completed, no error");
    }).catch(function(err) {
      Logger.displayError("Error in heatmap walkthrough", err);
    });
  };

  /*
  * Checks if it is the first time the user has loaded the heatmap tab. If it is then
  * show a walkthrough and store the info that the user has seen the tutorial.
  */
  var checkHeatmapTutorialDone = function () {
    var HEATMAP_DONE_KEY = 'heatmap_tutorial_done';
    var heatmapTutorialDone = KVStore.getDirect(HEATMAP_DONE_KEY);
    if (!heatmapTutorialDone) {
      startWalkthrough();
      KVStore.set(HEATMAP_DONE_KEY, true);
    }
  };

  $scope.startWalkthrough = function () {
    startWalkthrough();
  }

  $scope.$on('$ionicView.afterEnter', function(ev) {
    // Workaround from
    // https://github.com/driftyco/ionic/issues/3433#issuecomment-195775629
    if(ev.targetScope !== $scope)
      return;
    checkHeatmapTutorialDone();
  });
});
