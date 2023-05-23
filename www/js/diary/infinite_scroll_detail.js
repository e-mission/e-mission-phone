'use strict';
angular.module('emission.main.diary.infscrolldetail',['ui-leaflet',
                                      'nvd3', 'emission.plugin.kvstore',
                                      'emission.services',
                                      'emission.config.imperial',
                                      'emission.plugin.logger',
                                      'emission.stats.clientstats'])

.controller("InfiniteDiaryDetailCtrl", function($scope, $rootScope, $injector, $window, $ionicPlatform,
                                        $state, $stateParams, ClientStats, $ionicActionSheet,
                                        leafletData, leafletMapEvents, KVStore,
                                        Logger, Timeline, DiaryHelper, SurveyOptions, Config, ImperialConfig,
                                        DynamicConfig, CommHelper, $translate) {
  console.log("controller InfiniteDiaryDetailCtrl called with params = "+
    JSON.stringify($stateParams));

  $ionicPlatform.ready().then(function () {
    DynamicConfig.configReady().then((configObj) => {
      const surveyOptKey = configObj.survey_info['trip-labels'];
      $scope.surveyOpt = SurveyOptions[surveyOptKey];
    });
  });

  $scope.mapCtrl = {};
  angular.extend($scope.mapCtrl, {
    defaults : {
    }
  });

  angular.extend($scope.mapCtrl.defaults, Config.getMapTiles())

  $scope.$on('leafletDirectiveMap.infscroll-detail.resize', function(event, data) {
      console.log("diary/detail received resize event, invalidating map size");
      data.leafletObject.invalidateSize();
  });

  $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
  };

  $scope.trip = Timeline.getCompositeTrip($stateParams.tripId);
  $scope.formattedSectionProperties = DiaryHelper.getFormattedSectionProperties($scope.trip, ImperialConfig);

  if (!angular.isDefined($scope.trip)) {
    console.log("Detail trip = " + $scope.trip + " not defined, going back to the list view")
    $state.go("root.main.inf_scroll");
  } else {
    var data = [];
    var start_ts = $scope.trip.start_ts;
    var totalTime = 0;
    $scope.trip.locations.forEach(l => {
      totalTime = (l.ts - start_ts);
      data.push({x: totalTime, y: l.speed});
    });
    var dataset = {
      values: data,
      key: $translate.instant('details.speed'),
      color: '#7777ff',
    }
    var chart = nv.models.lineChart()
      .margin({ left: 65, right: 10 })  //Adjust chart margins to give the x-axis some breathing room.
      .useInteractiveGuideline(false)  //We want nice looking tooltips and a guideline!
      .x(function (t) { return t.x / 60 })
      .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
      .showYAxis(true)        //Show the y-axis
      .showXAxis(true);        //Show the x-axis
    chart.xAxis
      .tickFormat(d3.format(".1f"))
      .axisLabel($translate.instant('details.time') + ' (mins)');

    chart.yAxis     //Chart y-axis settings
      .axisLabel($translate.instant('details.speed') + ' (m/s)')
      .tickFormat(d3.format('.1f'));

    d3.selectAll('#chart svg')    //Select the <svg> element you want to render the chart in.
      .datum([dataset,])         //Populate the <svg> element with chart data...
      .call(chart);          //Finally, render the chart!

    //Update the chart when window resizes.
    nv.utils.windowResize(chart.update);
    nv.addGraph(chart);
  }

  $scope.$on('$ionicView.enter',function(){
    $scope.startTime = moment().utc()
    ClientStats.addEvent(ClientStats.getStatKeys().EXPANDED_TRIP).then(
      function() {
        console.log("Added "+ClientStats.getStatKeys().EXPANDED_TRIP+" event");
      }
    );
  });

  $scope.$on('$ionicView.leave',function() {
    var timeOnPage = moment().utc() - $scope.startTime;
    ClientStats.addReading(ClientStats.getStatKeys().DIARY_TIME, timeOnPage);
  });

  $ionicPlatform.on("pause", function() {
    if ($state.$current == "root.main.diary.detail") {
      var timeOnPage = moment().utc() - $scope.startTime;
      ClientStats.addReading(ClientStats.getStatKeys().DIARY_TIME, timeOnPage);
    }
  })

  $ionicPlatform.on("resume", function() {
    if ($state.$current == "root.main.diary.detail") {
      $scope.startTime = moment().utc()
    }
  })
})
