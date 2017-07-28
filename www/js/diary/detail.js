'use strict';
angular.module('emission.main.diary.detail',['ui-leaflet', 'ng-walkthrough',
                                      'ionic-datepicker', 'nvd3', 'angularLocalStorage',
                                      'emission.services', 'emission.plugin.logger',
                                      'emission.incident.posttrip.manual'])

.controller("DiaryDetailCtrl", function($scope, $rootScope, $window, $stateParams, $ionicActionSheet,
                                        leafletData, leafletMapEvents, nzTour, storage,
                                        Logger, Timeline, DiaryHelper, Config,
                                        CommHelper, PostTripManualMarker, $ionicPopover, $ionicPopup) {
  console.log("controller DiaryDetailCtrl called with params = "+
    JSON.stringify($stateParams));

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
        console.log("in mapEvents, event = "+JSON.stringify(event.name)+
              " leafletEvent = "+JSON.stringify(data.leafletEvent.type)+
              " leafletObject = "+JSON.stringify(data.leafletObject.getBounds()));
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

  $scope.getFormattedDate = DiaryHelper.getFormattedDate;
  $scope.arrowColor = DiaryHelper.arrowColor;
  $scope.parseEarlierOrLater = DiaryHelper.parseEarlierOrLater;
  $scope.getEarlierOrLater = DiaryHelper.getEarlierOrLater;
  $scope.getLongerOrShorter = DiaryHelper.getLongerOrShorter;
  $scope.getIcon = DiaryHelper.getIcon;
  $scope.getHumanReadable = DiaryHelper.getHumanReadable;
  $scope.getPercentages = DiaryHelper.getPercentages;
  $scope.allModes = DiaryHelper.allModes;
  $scope.trip = Timeline.getTrip($stateParams.tripId);
  $scope.getKmph = DiaryHelper.getKmph;
  $scope.getFormattedDistance = DiaryHelper.getFormattedDistance;
  $scope.getSectionDetails = DiaryHelper.getSectionDetails;
  $scope.getFormattedTime = DiaryHelper.getFormattedTime;
  $scope.getFormattedTimeRange = DiaryHelper.getFormattedTimeRange;
  $scope.getFormattedDuration = DiaryHelper.getFormattedDuration;
  $scope.getTripDetails = DiaryHelper.getTripDetails
  $scope.tripgj = DiaryHelper.directiveForTrip($scope.trip);

  $scope.getTripBackground = function() {
     var ret_val = DiaryHelper.getTripBackground($rootScope.dark_theme, $scope.tripgj);
     return ret_val;
  }

  console.log("trip.start_place = " + JSON.stringify($scope.trip.start_place));

  leafletData.getMap('detail').then(function(map) {
    map.on('click', PostTripManualMarker.startAddingIncidentToTrip($scope.trip, map));
  });

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
      key: 'Speed',
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
    .axisLabel('Time (mins)');

  chart.yAxis     //Chart y-axis settings
      .axisLabel('Speed (m/s)')
      .tickFormat(d3.format('.1f'));

  d3.select('#chart svg')    //Select the <svg> element you want to render the chart in.
      .datum([dataset,])         //Populate the <svg> element with chart data...
      .call(chart);          //Finally, render the chart!


  //Update the chart when window resizes.
  nv.utils.windowResize(chart.update);
  nv.addGraph(chart);

  /* START: ng-walkthrough code */
  // Tour steps
  var tour = {
    config: {
      mask: {
        visibleOnNoTarget: true,
        clickExit: true
      }
    },
    steps: [{
      target: '#detail',
      content: 'To report an incident, zoom in as much as possible to the location where the incident occurred and click on the trip to mark a &#x263B; or &#x2639; incident'
    }, {
      target: '#sectionList',
      content: 'Trip sections, along with times and modes'
    }, {
      target: '#sectionPct',
      content: '% of time spent in each mode for this trip'
    }]
  };

  var startWalkthrough = function () {
    nzTour.start(tour).then(function(result) {
      Logger.log("detail walkthrough start completed, no error");
    }).catch(function(err) {
      Logger.log("detail walkthrough start errored" + err);
    });
  };


  var checkDetailTutorialDone = function () {
    var DETAIL_DONE_KEY = 'detail_tutorial_done';
    var detailTutorialDone = storage.get(DETAIL_DONE_KEY);
    if (!detailTutorialDone) {
      startWalkthrough();
      storage.set(DETAIL_DONE_KEY, true);
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
  /* END: ng-walkthrough code */

  $ionicPopover.fromTemplateUrl('templates/diary/mode-popover.html', {
      scope: $scope
   }).then(function(popover) {
      $scope.modePopover = popover;
   });

   $scope.openModePopover = function($event) {
      $scope.modePopover.show($event);
   };

   $ionicPopover.fromTemplateUrl('templates/diary/destination-popover.html', {
      scope: $scope
   }).then(function(popover) {
      $scope.destinationPopover = popover;
   });

   $scope.openDestinationPopover = function($event) {
      $scope.destinationPopover.show($event);
   };

  $scope.chosen = {mode:'',destination:'',other:''};

   var checkOtherOption = function(choice) {
    if(choice == 'other_mode' || choice == 'other_destination') {
      var text = choice == 'other_mode' ? "mode" : "destination"
      $ionicPopup.show({title: "Please fill in the " + text + " not listed.",
        scope: $scope,
        template: '<input type = "text" ng-model = "chosen.other">',        
        buttons: [
            { text: 'Cancel' }, {
               text: '<b>Save</b>',
               type: 'button-positive',
                  onTap: function(e) {
                     if (!$scope.chosen.other) {
                           e.preventDefault();
                     } else {
                        if(choice == 'other_mode') {
                          alert(choice + " " +$scope.chosen.other);  // store mode here
                          $scope.chosen.other = '';
                        } else {
                          alert(choice + " " +$scope.chosen.other);  // store destination here
                          $scope.chosen.other = '';
                        }
                        return $scope.chosen.other;
                     }
                  }
            }
        ]
      });

    }
   };

  $scope.chooseDestination = function() {
    if($scope.chosen.destination != "other_destination"){
      alert($scope.chosen.destination); // store mode here
    } else {
      checkOtherOption($scope.chosen.destination);
    }
  };

  $scope.chooseMode = function (){
    if($scope.chosen.mode != "other_mode"){
      alert($scope.chosen.mode); // store Destination here
    } else {
      checkOtherOption($scope.chosen.mode);
    }
  };

   $scope.modeOptions = [
   {text:'Walk', value:'walk'},
   {text:'Bike',value:'bike'},
   {text:'Drove Alone',value:'drove_alone'},
   {text:'Shared Ride',value:'shared_ride'},
   {text:'Taxi',value:'taxi'},
   {text:'Bus',value:'bus'},
   {text:'Train',value:'train'},
   {text:'Free Shuttle',value:'free_shuttle'},
   {text:'Other',value:'other_mode'}];

   $scope.destinationOptions = [
   {text:'Home', value:'home'},
   {text:'Work',value:'work'},
   {text:'School',value:'school'},
   {text:'Shopping',value:'shopping'},
   {text:'Meal',value:'meal'},
   {text:'Pick-up/drop off',value:'pick_drop'},
   {text:'Personal/medical',value:'personal_med'},
   {text:'Recreation/exercise',value:'exercise'},
   {text:'Entertainment/social',value:'entertainment'},
   {text:'Religious', value:'religious'},
   {text:'Other',value:'other_destination'}];

});
