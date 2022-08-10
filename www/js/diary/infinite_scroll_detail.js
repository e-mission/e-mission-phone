'use strict';
angular.module('emission.main.diary.infscrolldetail',['ui-leaflet', 'ng-walkthrough',
                                      'nvd3', 'emission.plugin.kvstore',
                                      'emission.services',
                                      'emission.config.imperial',
                                      'emission.plugin.logger',
                                      'emission.stats.clientstats',
                                      'emission.incident.posttrip.manual'])

.controller("InfiniteDiaryDetailCtrl", function($scope, $rootScope, $injector, $window, $ionicPlatform,
                                        $state, $stateParams, ClientStats, $ionicActionSheet,
                                        leafletData, leafletMapEvents, nzTour, KVStore,
                                        Logger, Timeline, DiaryHelper, SurveyOptions, Config, ImperialConfig,
                                        CommHelper, PostTripManualMarker, $translate) {
  console.log("controller InfiniteDiaryDetailCtrl called with params = "+
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
    var eventName = 'leafletDirectiveMap.infscroll-detail.' + mapEvents[k];
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

  $scope.$on('leafletDirectiveMap.infscroll-detail.resize', function(event, data) {
      console.log("diary/detail received resize event, invalidating map size");
      data.leafletObject.invalidateSize();
  });

  $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
  };

  $scope.trip = Timeline.getConfirmedTrip($stateParams.tripId);
  Timeline.confirmedTrip2Geojson($scope.trip).then((tripgj) => {
    $scope.$apply(() => {
        $scope.tripgj = $scope.trip;
        $scope.tripgj.data = tripgj;
        $scope.tripgj.common = {};
        $scope.tripgj.common.earlierOrLater = '';
        $scope.tripgj.pointToLayer = DiaryHelper.pointFormat;
        
        if (!angular.isDefined($scope.trip) || !angular.isDefined($scope.tripgj)) {
          console.log("Detail trip = "+$scope.trip+" tripgj = "+$scope.tripgj+" not defined, going back to the list view")
          $state.go("root.main.inf_scroll");
        }
    });
  });

  $scope.recomputeDisplayTrips = function() {
    console.log("Called inf scroll details.recomputeDisplayTrips");
    const filterMap = $scope.filterInputs.map((f) => f.filter($scope.trip));
    const filterValue = filterMap.reduce((a, b) => a || b, false);
    console.log("filterMap = "+filterMap+" value = "+filterValue);
    // if the trip was going to stay (not be filtered), we should not go back to the scroll list
    if (!filterValue) {
        $state.go("root.main.inf_scroll");
    }
  };

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
