'use strict';

angular.module('emission.main.diary.list',['ui-leaflet',
                                      'ionic-datepicker',
                                      'emission.main.common.services',
                                      'emission.incident.posttrip.manual',
                                      'emission.services',
                                      'ng-walkthrough', 'nzTour', 'angularLocalStorage',
                                      'emission.plugin.logger'])

.controller("DiaryListCtrl", function($window, $scope, $rootScope, $ionicPlatform, $state,
                                    $ionicScrollDelegate, $ionicPopup,
                                    $ionicLoading,
                                    $ionicActionSheet,
                                    ionicDatePicker,
                                    leafletData, Timeline, CommonGraph, DiaryHelper,
                                    Config, PostTripManualMarker, nzTour, storage, Logger, $ionicPopover) {
  console.log("controller DiaryListCtrl called");
  // Add option
  // StatusBar.styleBlackOpaque()
  $scope.dark_theme = $rootScope.dark_theme;

  $scope.$on('leafletDirectiveMap.resize', function(event, data) {
      console.log("diary/list received resize event, invalidating map size");
      data.leafletObject.invalidateSize();
  });

  var readAndUpdateForDay = function(day) {
    // This just launches the update. The update can complete in the background
    // based on the time when the database finishes reading.
    // TODO: Convert the usercache calls into promises so that we don't have to
    // do this juggling
    Timeline.updateForDay(day);
    // CommonGraph.updateCurrent();
  };

  $scope.$on('$ionicView.afterEnter', function() {
    if($rootScope.barDetail){
      readAndUpdateForDay($rootScope.barDetailDate);
      $rootScope.barDetail = false;
    }

    if($rootScope.displayingIncident == true) {
      if (angular.isDefined(Timeline.data.currDay)) {
        // page was already loaded, reload it automatically
        readAndUpdateForDay(Timeline.data.currDay);
      } else {
        Logger.log("currDay is not defined, load not complete");
      }
      $rootScope.displayingIncident = false;
    }
  });

  readAndUpdateForDay(moment().startOf('day'));

  angular.extend($scope, {
      defaults: {
          zoomControl: false,
          dragging: false,
          zoomAnimation: true,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
      }
  });

  angular.extend($scope.defaults, Config.getMapTiles())

  moment.locale('en', {
    relativeTime : {
        future: "in %s",
        past:   "%s ago",
        s:  "secs",
        m:  "a min",
        mm: "%d m",
        h:  "an hr",
        hh: "%d h",
        d:  "a day",
        dd: "%d days",
        M:  "a month",
        MM: "%d months",
        y:  "a year",
        yy: "%d years"
    }
});

    /*
    * While working with dates, note that the datepicker needs a javascript date because it uses
    * setHours here, while the currDay is a moment, since we use it to perform
    * +date and -date operations.
    */
    $scope.listExpandClass = function () {
      return ($scope.dark_theme)? "earlier-later-expand-dark" : "earlier-later-expand";
    }
    $scope.listLocationClass = function() {
      return ($scope.dark_theme)? "item item-icon-left list-location-dark" : "item item-icon-left list-location";
    }
    $scope.listTextClass = function() {
      return ($scope.dark_theme)? "list-text-dark" : "list-text";
    }
    $scope.ionViewBackgroundClass = function() {
      return ($scope.dark_theme)? "ion-view-background-dark" : "ion-view-background";
    }
    $scope.datePickerClass = function() {
    }
    $scope.listCardClass = function(tripgj) {
      var background = DiaryHelper.getTripBackground($scope.dark_theme, tripgj);
      if ($window.screen.width <= 320) {
        return "list card list-card "+ background +" list-card-sm";
      } else if ($window.screen.width <= 375) {
        return "list card list-card "+ background +" list-card-md";
      } else {
        return "list card list-card "+background+" list-card-lg";
      }

    }
    $scope.listColLeftClass = function(margin) {
      if (margin == 0) {
        return ($scope.dark_theme)? "col-50 list-col-left-dark" : "col-50 list-col-left";
      } else {
        return ($scope.dark_theme)? "col-50 list-col-left-margin-dark" : "col-50 list-col-left-margin";
      }
    }
    $scope.listColRightClass = function() {
      return ($scope.dark_theme)? "col-50 list-col-right-dark" : "col-50 list-col-right";
    }
    $scope.differentCommon = function(tripgj) {
        return ($scope.isCommon(tripgj.id))? ((DiaryHelper.getEarlierOrLater(tripgj.data.properties.start_ts, tripgj.data.id) == '')? false : true) : false;
    }
    $scope.stopTimeTagClass = function(tripgj) {
      return ($scope.differentCommon(tripgj))? "stop-time-tag-lower" : "stop-time-tag";
    }
    $scope.setCurrDay = function(val) {
        if (typeof(val) === 'undefined') {
          window.Logger.log(window.Logger.LEVEL_INFO, 'No date selected');
        } else {
          window.Logger.log(window.Logger.LEVEL_INFO, 'Selected date is :' + val);
          readAndUpdateForDay(moment(val));
        }
    }
    $scope.localTimeString = function(dt) {
      var hr = ((dt.hour > 12))? dt.hour - 12 : dt.hour;
      var post = ((dt.hour >= 12))? " pm" : " am";
      var min = (dt.minute.toString().length == 1)? "0" + dt.minute.toString() : dt.minute.toString();
      return hr + ":" + min + post;
    }

    $scope.datepickerObject = {

      todayLabel: 'Today',  //Optional
      closeLabel: 'Close',  //Optional
      setLabel: 'Set',  //Optional
      setButtonType : 'button-positive',  //Optional
      todayButtonType : 'button-stable',  //Optional
      closeButtonType : 'button-stable',  //Optional
      inputDate: new Date(),  //Optional
      from: new Date(2015, 1, 1),
      to: new Date(),
      mondayFirst: true,  //Optional
      templateType: 'popup', //Optional
      showTodayButton: 'true', //Optional
      modalHeaderColor: 'bar-positive', //Optional
      modalFooterColor: 'bar-positive', //Optional
      callback: $scope.setCurrDay, //Mandatory
      dateFormat: 'dd MMM yyyy', //Optional
      closeOnSelect: true //Optional
    };

    $scope.pickDay = function() {
      ionicDatePicker.openDatePicker($scope.datepickerObject);
    }

    $scope.$on(Timeline.UPDATE_DONE, function(event, args) {
      console.log("Got timeline update done event with args "+JSON.stringify(args));
      $scope.$apply(function() {
          $scope.data = Timeline.data;
          $scope.datepickerObject.inputDate = Timeline.data.currDay.toDate();
          $scope.data.currDayTrips.forEach(function(trip, index, array) {
              PostTripManualMarker.addUnpushedIncidents(trip);
          });
          $scope.data.currDayTripWrappers = Timeline.data.currDayTrips.map(
            DiaryHelper.directiveForTrip);
          $ionicScrollDelegate.scrollTop(true);
      });
    });

    $scope.$on(CommonGraph.UPDATE_DONE, function(event, args) {
      console.log("Got common graph update done event with args "+JSON.stringify(args));
      $scope.$apply(function() {
          // If we don't have the trip wrappers yet, then we can just bail because
          // the counts will be filled in when that is done. If the currDayTripWrappers
          // is already defined, that may have won the race, and not been able to update
          // the counts, so let us do it here.
          if (!angular.isUndefined($scope.data) && !angular.isUndefined($scope.data.currDayTripWrappers)) {
             $scope.data.currDayTripWrappers.forEach(function(tripWrapper, index, array) {
                DiaryHelper.fillCommonTripCount(tripWrapper);
             });
          };
      });
    });

    $scope.setColor = function(mode) {
      var colors = {"icon ion-android-bicycle":'green',
    "icon ion-android-walk":'brown',
    "icon ion-speedometer":'purple',
    "icon ion-android-bus": "purple",
    "icon ion-android-train": "navy",
    "icon ion-android-car": "salmon",
    "icon ion-plane": "red"};
      return { color: colors[mode] };
    }

    var showNoTripsAlert = function() {
        var buttons = [
            {text: 'New', type: 'button-balanced', onTap: function(e) { $state.go('root.main.recent.log'); }},
            {text: 'Force', type: 'button-balanced', onTap: function(e) { $state.go('root.main.control'); }},
            {text: 'OK', type: 'button-balanced', onTap: function(e) { return; }},
        ];
        console.log("No trips found for day ");
        var alertPopup = $ionicPopup.show({
             title: 'No trips found!',
             template: "This is probably because you didn't go anywhere. You can also check",
             buttons: buttons
        });
        return alertPopup;
    }

    /*
     * Disabling the reload of the page on background sync because it doesn't
     * work correctly.  on iOS, plugins are not loaded if backgroundFetch or
     * remote push are invoked, since they don't initialize the app. On
     * android, it looks like the thread ends before the maps are fully loaded,
     * so we have half displayed, frozen maps. We should really check the
     * status, reload here if active and reload everything on resume.
     * For now, we just add a refresh button to avoid maintaining state.
    window.broadcaster.addEventListener( "edu.berkeley.eecs.emission.sync.NEW_DATA", function( e ) {
        window.Logger.log(window.Logger.LEVEL_INFO,
            "new data received! reload data for the current day"+$scope.data.currDay);
        $window.location.reload();
        // readAndUpdateForDay($scope.data.currDay);
    });
    */

    $scope.refresh = function() {
      if ($ionicScrollDelegate.getScrollPosition().top < 5) {
       readAndUpdateForDay(Timeline.data.currDay);
       $scope.$broadcast('invalidateSize');
      }
    }

    /* For UI control */
    $scope.groups = [];
    for (var i=0; i<10; i++) {
      $scope.groups[i] = {
        name: i,
        items: ["good1", "good2", "good3"]
      };
      for (var j=0; j<3; j++) {
        $scope.groups[i].items.push(i + '-' + j);
      }
    }
    $scope.toggleGroup = function(group) {
      if ($scope.isGroupShown(group)) {
        $scope.shownGroup = null;
      } else {
        $scope.shownGroup = group;
      }
    };
    $scope.isGroupShown = function(group) {
      return $scope.shownGroup === group;
    };
    $scope.getEarlierOrLater = DiaryHelper.getEarlierOrLater;
    $scope.getLongerOrShorter = DiaryHelper.getLongerOrShorter;
    $scope.getHumanReadable = DiaryHelper.getHumanReadable;
    $scope.allModes = DiaryHelper.allModes;
    $scope.getKmph = DiaryHelper.getKmph;
    $scope.getPercentages = DiaryHelper.getPercentages;
    $scope.getFormattedDistance = DiaryHelper.getFormattedDistance;
    $scope.getSectionDetails = DiaryHelper.getSectionDetails;
    $scope.getFormattedTime = DiaryHelper.getFormattedTime;
    $scope.getFormattedTimeRange = DiaryHelper.getFormattedTimeRange;
    $scope.getFormattedDuration = DiaryHelper.getFormattedDuration;
    $scope.getTripDetails = DiaryHelper.getTripDetails;
    $scope.starColor = DiaryHelper.starColor;
    $scope.arrowColor = DiaryHelper.arrowColor;
    $scope.getArrowClass = DiaryHelper.getArrowClass;
    $scope.isCommon = DiaryHelper.isCommon;
    $scope.isDraft = DiaryHelper.isDraft;
    // $scope.expandEarlierOrLater = DiaryHelper.expandEarlierOrLater;
    // $scope.increaseRestElementsTranslate3d = DiaryHelper.increaseRestElementsTranslate3d;

    $scope.makeCurrent = function() {
        $ionicPopup.alert({template: "Coming soon, after Shankari's quals in early March!"});
    }

    $scope.userModes = [
        "walk", "bicycle", "car", "bus", "train", "unicorn"
    ];
    $scope.parseEarlierOrLater = DiaryHelper.parseEarlierOrLater;

    $scope.getTimeSplit = function(tripList) {
        var retVal = {};
        var tripTimes = tripList.map(function(dt) {
            return dt.data.properties.duration;
        });

    };

    // Tour steps
    var tour = {
      config: {
        mask: {
          visibleOnNoTarget: true,
          clickExit: true
        }
      },
      steps: [{
        target: '#date-picker-button',
        content: 'Use this to select the day you want to see.'
      },
      {
        target: '.diary-entry',
        content: 'Click on ">" button to see more details about each trip and take our survey'
      },
      {
        target: '#map-fix-button',
        content: 'Use this to fix the map tiles if they have not loaded properly.'
      }]
    };

    var startWalkthrough = function () {
      nzTour.start(tour).then(function(result) {
        Logger.log("list walkthrough start completed, no error");
      }).catch(function(err) {
        Logger.log("list walkthrough start errored" + err);
      });
    };

    $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
    };

    /*
    * Checks if it is the first time the user has loaded the diary tab. If it is then
    * show a walkthrough and store the info that the user has seen the tutorial.
    */
    var checkDiaryTutorialDone = function () {
      var DIARY_DONE_KEY = 'diary_tutorial_done';
      var diaryTutorialDone = storage.get(DIARY_DONE_KEY);
      if (!diaryTutorialDone) {
        startWalkthrough();
        storage.set(DIARY_DONE_KEY, true);
      }
    };

    $scope.startWalkthrough = function () {
      startWalkthrough();
    }

    $scope.$on('$ionicView.enter', function(ev) {
      // Workaround from
      // https://github.com/driftyco/ionic/issues/3433#issuecomment-195775629
      if(ev.targetScope !== $scope)
        return;
      checkDiaryTutorialDone();
    });

    $scope.prevDay = function() {
        console.log("Called prevDay when currDay = "+Timeline.data.currDay.format('YYYY-MM-DD'));
        var prevDay = moment(Timeline.data.currDay).subtract(1, 'days');
        console.log("prevDay = "+prevDay.format('YYYY-MM-DD'));
        readAndUpdateForDay(prevDay);
    };

    $scope.nextDay = function() {
        console.log("Called nextDay when currDay = "+Timeline.data.currDay.format('YYYY-MM-DD'));
        var nextDay = moment(Timeline.data.currDay).add(1, 'days');
        console.log("nextDay = "+nextDay);
        readAndUpdateForDay(nextDay);
    };

    $scope.toDetail = function() {
      $state.go('root.main.detail');
    };

    $scope.redirect = function(){
      $state.go("root.main.current");
    };

    var in_trip;
    $scope.checkTripState = function() {
      window.cordova.plugins.BEMDataCollection.getState().then(function(result) {
        Logger.log("Current trip state" + JSON.stringify(result));
        if(JSON.stringify(result) ==  "\"STATE_ONGOING_TRIP\"" ||
          JSON.stringify(result) ==  "\"local.state.ongoing_trip\"") {
          in_trip = true;
        } else {
          in_trip = false;
        }
      });
    };

    // storing boolean to in_trip and return it in inTrip function
    // work because ng-show is watching the inTrip function.
    // Returning a promise to ng-show did not work.
    // Changing in_trip = bool value; in checkTripState function
    // to return bool value and using checkTripState function in ng-show
    // did not work.
    $scope.inTrip = function() {
      $scope.checkTripState();
      return in_trip;
    };

      $scope.showModes = DiaryHelper.showModes;

  $scope.takeSurvey = function(start_ts, end_ts) {
    console.log("About to display survey: ", 'start_ts: ', start_ts, ' end_ts: ', end_ts);
    $state.go("root.main.incident", {
      start_ts: start_ts,
      end_ts: end_ts,
    });
  };
});
