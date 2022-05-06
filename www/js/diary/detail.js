'use strict';
angular.module('emission.main.diary.detail',['ui-leaflet', 'ng-walkthrough',
                                      'nvd3', 'emission.plugin.kvstore',
                                      'emission.services',
                                      'emission.config.imperial',
                                      'emission.plugin.logger',
                                      'emission.stats.clientstats',
                                      'emission.incident.posttrip.manual'])

.controller("DiaryDetailCtrl", function($scope, $rootScope, $window, $injector, $ionicPlatform,
                                        $state, $stateParams, ClientStats, $ionicActionSheet,
                                        leafletData, leafletMapEvents, nzTour, KVStore,
                                        Logger, Timeline, DiaryHelper, SurveyOptions, Config, ImperialConfig,
                                        CommHelper, PostTripManualMarker, $translate) {
  console.log("controller DiaryDetailCtrl called with params = "+
    JSON.stringify($stateParams));
  $scope.surveyOpt = SurveyOptions.MULTILABEL;
  $scope.tripFilterFactory = $injector.get($scope.surveyOpt.filter);
  $scope.filterInputs = $scope.tripFilterFactory.configuredFilters;

  $scope.mapCtrl = {};
  angular.extend($scope.mapCtrl, {
    defaults : {
    }
  });

  angular.extend($scope.mapCtrl.defaults, Config.getMapTiles())

  var mapEvents = leafletMapEvents.getAvailableMapEvents();
  for (var k in mapEvents) {
    var eventName = 'leafletDirectiveMap.detail.' + mapEvents[k];
    $scope.$on(eventName, function(event, data){
        try {
            console.log("in mapEvents, event = "+JSON.stringify(event.name)+
                  " leafletEvent = "+JSON.stringify(data.leafletEvent.type)+
                  " leafletObject = "+JSON.stringify(data.leafletObject.getBounds()));
        } catch (e) {
            if (e instanceof TypeError) {
                console.log("in mapEvents, event = "+JSON.stringify(event.name)+
                      " leafletEvent = "+JSON.stringify(data.leafletEvent.type)+
                      " leafletObject is undefined");
            } else {
                console.log(e);
            }
        }
        $scope.eventDetected = event.name;
    });
  }

  /*
  leafletData.getMap('detail').then(function(map) {
    map.on('touch', function(ev) {
      alert("touch" + ev.latlng); // ev is an event object (MouseEvent in this case)
    });
  });
  */

  $scope.$on('leafletDirectiveMap.detail.resize', function(event, data) {
      console.log("diary/detail received resize event, invalidating map size");
      data.leafletObject.invalidateSize();
  });

  $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
  };

  $scope.trip = Timeline.getTrip($stateParams.tripId);
  $scope.tripgj = $scope.trip == undefined? {"sections": []} : Timeline.getTripWrapper($stateParams.tripId);

  $scope.formattedSectionProperties = $scope.tripgj.sections.map(function(s) {
    return {"fmt_time": DiaryHelper.getLocalTimeString(s.properties.start_local_dt),
            "fmt_time_range": DiaryHelper.getFormattedTimeRange(s.properties.end_ts, s.properties.start_ts),
            "fmt_distance": ImperialConfig.getFormattedDistance(s.properties.distance),
            "fmt_distance_suffix": ImperialConfig.getDistanceSuffix,
            "icon": DiaryHelper.getIcon(s.properties.sensed_mode),
            "colorStyle": {color: DiaryHelper.getColor(s.properties.sensed_mode)}
            };
  });

  $scope.recomputeDisplayTrips = function() {
    console.log("Called diary details.recomputeDisplayTrips");
    // Let's copy over the userInput to the field expected by the checks (user_input)
    // We definitely need to unify this ASAP
    $scope.tripgj.user_input = $scope.tripgj.userInput;
    const filterMap = $scope.filterInputs.map((f) => f.filter($scope.tripgj));
    // again, we cannot use both filters in the detail screen because the trip
    // version of in the list view doesn't have the expectation value filled
    // out. We really need to unify ASAP!
    console.log("filterMap = "+filterMap+" we will only use the second (unlabeled check)");
    // if the trip was going to stay (not be filtered), we should not go back to the scroll list
    // TODO: Unify with infinite scroll and remove this hack
    if (!filterMap[1]) {
        $state.go("root.main.diary");
    }
  };

  if (!angular.isDefined($scope.trip) || !angular.isDefined($scope.tripgj)) {
    console.log("Detail trip not defined, going back to the list view")
    $state.go("root.main.diary");
  } else {
  console.log("trip.start_place = " , $scope.trip);

  var data  = [];
  var start_ts = $scope.trip.properties.start_ts;
  var totalTime = 0;
  for (var s in $scope.tripgj.sections) {
    // ti = time index
    for (var ti in $scope.tripgj.sections[s].properties.times) {
      totalTime = ($scope.tripgj.sections[s].properties.times[ti] - start_ts);
      data.push({x: totalTime, y: $scope.tripgj.sections[s].properties.speeds[ti] });
    }
  }
  var dataset = {
      values: data,
      key: $translate.instant('details.speed'),
      color: '#7777ff',
    }
  var chart = nv.models.lineChart()
                .margin({left: 65, right: 10})  //Adjust chart margins to give the x-axis some breathing room.
                .useInteractiveGuideline(false)  //We want nice looking tooltips and a guideline!
                .x(function(t) {return t.x / 60})
                .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
                .showYAxis(true)        //Show the y-axis
                .showXAxis(true);        //Show the x-axis
  chart.xAxis
    .tickFormat(d3.format(".1f"))
    .axisLabel($translate.instant('details.time') + ' (mins)');

  chart.yAxis     //Chart y-axis settings
      .axisLabel($translate.instant('details.speed') + ' (m/s)')
      .tickFormat(d3.format('.1f'));

  d3.select('#chart svg')    //Select the <svg> element you want to render the chart in.
      .datum([dataset,])         //Populate the <svg> element with chart data...
      .call(chart);          //Finally, render the chart!


  //Update the chart when window resizes.
  nv.utils.windowResize(chart.update);
  nv.addGraph(chart);
  }

  /* START: ng-walkthrough code */
  // Tour steps
  var tour = {
    config: {
      mask: {
        visibleOnNoTarget: true,
        clickExit: true
      },
      previousText: $translate.instant('tour-previous'),
      nextText: $translate.instant('tour-next'),
      finishText: $translate.instant('tour-finish')
    },
    steps: [{
      target: '#detail',
      content: $translate.instant('details.tour-detail-content')
    }, {
      target: '#sectionList',
      content: $translate.instant('details.tour-sectionList-content')
    }, {
      target: '#sectionPct',
      content: $translate.instant('details.tour-sectionPct-content')
    }]
  };

  var startWalkthrough = function () {
    nzTour.start(tour).then(function(result) {
      Logger.log("detail walkthrough start completed, no error");
    }).catch(function(err) {
      Logger.displayError("detail walkthrough start errored", err);
    });
  };


  var checkDetailTutorialDone = function () {
    var DETAIL_DONE_KEY = 'detail_tutorial_done';
    var detailTutorialDone = KVStore.getDirect(DETAIL_DONE_KEY);
    if (!detailTutorialDone) {
      startWalkthrough();
      KVStore.set(DETAIL_DONE_KEY, true);
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
    checkDetailTutorialDone();
  });

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
  /* END: ng-walkthrough code */
})
