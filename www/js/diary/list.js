'use strict';

/*
 * The general structure of this code is that all the timeline information for
 * a particular day is retrieved from the Timeline factory and put into the scope.
 * For best performance, all data should be loaded into the in-memory timeline,
 * and in addition to writing to storage, the data should be written to memory.
 * All UI elements should only use $scope variables.
 */

angular.module('emission.main.diary.list',['ui-leaflet',
                                      'ionic-datepicker',
                                      'emission.main.common.services',
                                      'emission.services',
                                      'emission.config.imperial',
                                      'emission.survey',
                                      'ng-walkthrough', 'nzTour', 'emission.plugin.kvstore',
                                      'emission.stats.clientstats',
                                      'emission.plugin.logger',
                                      'emission.main.diary.diarylistitem'
  ])

.controller("DiaryListCtrl", function($window, $scope, $rootScope, $injector,
                                    $ionicPlatform, $state,
                                    $ionicScrollDelegate, $ionicPopup, ClientStats,
                                    $ionicLoading,
                                    $ionicActionSheet,
                                    $timeout,
                                    ionicDatePicker,
                                    leafletData, Timeline, CommonGraph, DiaryHelper,
                                    SurveyOptions,
    Config, ImperialConfig, PostTripManualMarker, nzTour, KVStore, Logger, UnifiedDataLoader, $ionicPopover, $translate) {
  console.log("controller DiaryListCtrl called");
  const DEFAULT_ITEM_HT = 335;
  $scope.surveyOpt = SurveyOptions.MULTILABEL;
  ClientStats.addReading(ClientStats.getStatKeys().LABEL_TAB_SWITCH,
    {"source": null, "dest": $scope.data? $scope.data.currDay : undefined});
  // Add option
  $scope.labelPopulateFactory = $injector.get($scope.surveyOpt.service);
  $scope.itemHt = DEFAULT_ITEM_HT;

  var readAndUpdateForDay = function(day) {
    // This just launches the update. The update can complete in the background
    // based on the time when the database finishes reading.
    // TODO: Convert the usercache calls into promises so that we don't have to
    // do this juggling
    $scope.itemHt = DEFAULT_ITEM_HT;
    Timeline.updateForDay(day);
    // This will be used to show the date of datePicker in the user language.
    $scope.currDay = moment(day).format('LL');
    // CommonGraph.updateCurrent();
  };

//   moment.locale('en', {
//   relativeTime : {
//       future: "in %s",
//       past:   "%s ago",
//       s:  "secs",
//       m:  "a min",
//       mm: "%d m",
//       h:  "an hr",
//       hh: "%d h",
//       d:  "a day",
//       dd: "%d days",
//       M:  "a month",
//       MM: "%d months",
//       y:  "a year",
//       yy: "%d years"
//   }
// });

    /*
    * While working with dates, note that the datepicker needs a javascript date because it uses
    * setHours here, while the currDay is a moment, since we use it to perform
    * +date and -date operations.
    */
    $scope.listExpandClass = "earlier-later-expand";
    $scope.listLocationClass = "item item-icon-left list-location";
    $scope.listTextClass = "list-text";

    $scope.listCardClass = function(tripgj) {
      var background = tripgj.background;
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
        return "col-50 list-col-left";
      } else {
        return "col-50 list-col-left-margin";
      }
    }
    $scope.listColRightClass = "col-50 list-col-right"

    $scope.differentCommon = function(tripgj) {
        return (DiaryHelper.isCommon(tripgj.id))? ((DiaryHelper.getEarlierOrLater(tripgj.data.properties.start_ts, tripgj.data.id) == '')? false : true) : false;
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

    $scope.getDatePickerObject = function() {
      return {
        todayLabel: $translate.instant('list-datepicker-today'),  //Optional
        closeLabel: $translate.instant('list-datepicker-close'),  //Optional
        setLabel: $translate.instant('list-datepicker-set'),  //Optional
        monthsList: moment.monthsShort(),
        weeksList: moment.weekdaysMin(),
        titleLabel: $translate.instant('diary.list-pick-a-date'),
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
      }
    };

    $scope.datepickerObject = $scope.getDatePickerObject();

    $ionicPlatform.on("resume", function() {
        $scope.datepickerObject = $scope.getDatePickerObject();
    });

    $scope.pickDay = function() {
      ionicDatePicker.openDatePicker($scope.datepickerObject);
    }


    $scope.populateBasicClasses = function(tripgj) {
        tripgj.display_start_time = DiaryHelper.getLocalTimeString(tripgj.data.properties.start_local_dt);
        tripgj.display_end_time = DiaryHelper.getLocalTimeString(tripgj.data.properties.end_local_dt);
        tripgj.display_distance = ImperialConfig.getFormattedDistance(tripgj.data.properties.distance);
        tripgj.display_distance_suffix = ImperialConfig.getDistanceSuffix;
        tripgj.display_date = moment(tripgj.data.properties.start_ts * 1000).format('ddd DD MMM YY');
        tripgj.display_time = DiaryHelper.getFormattedTimeRange(tripgj.data.properties.start_ts,
                                tripgj.data.properties.end_ts);
        tripgj.isDraft = DiaryHelper.isDraft(tripgj);
        tripgj.background = DiaryHelper.getTripBackground(tripgj);
        tripgj.listCardClass = $scope.listCardClass(tripgj);
        tripgj.percentages = DiaryHelper.getPercentages(tripgj)
    }

    $scope.populateCommonInfo = function(tripgj) {
        tripgj.common = {}
        DiaryHelper.fillCommonTripCount(tripgj);
        tripgj.common.different = $scope.differentCommon(tripgj);
        tripgj.common.longerOrShorter = DiaryHelper.getLongerOrShorter(tripgj.data, tripgj.data.id);
        tripgj.common.listColLeftClass = $scope.listColLeftClass(tripgj.common.longerOrShorter[0]);
        tripgj.common.stopTimeTagClass = $scope.stopTimeTagClass(tripgj);
        tripgj.common.arrowColor = DiaryHelper.arrowColor(tripgj.common.longerOrShorter[0]);
        tripgj.common.arrowClass = DiaryHelper.getArrowClass(tripgj.common.longerOrShorter[0]);

        tripgj.common.earlierOrLater = DiaryHelper.getEarlierOrLater(tripgj.data.properties.start_ts, tripgj.data.id);
        tripgj.common.displayEarlierLater = DiaryHelper.parseEarlierOrLater(tripgj.common.earlierOrLater);
    }

    $scope.explainDraft = function($event) {
      $event.stopPropagation();
      $ionicPopup.alert({
        template: $translate.instant('list-explainDraft-alert')
      });
      // don't want to go to the detail screen
    }

    $scope.$on(Timeline.UPDATE_DONE, function(event, args) {
      console.log("Got timeline update done event with args "+JSON.stringify(args));
      $scope.$apply(function() {
          $scope.data = Timeline.data;
          $scope.datepickerObject.inputDate = Timeline.data.currDay.toDate();
          $scope.data.currDayTrips.forEach(function(trip, index, array) {
            PostTripManualMarker.addUnpushedIncidents(trip);
          });
          var currDayTripWrappers = Timeline.data.currDayTrips.map(
            DiaryHelper.directiveForTrip);
          Timeline.setTripWrappers(currDayTripWrappers);

          // Add "next" pointers to make it easier to use trip linkages for display
          $scope.data.currDayTripWrappers.forEach(function(tripgj, tripIndex, array) {
            tripgj.nextTripgj = array[tripIndex+1];

            // First populate basic classes so that we can use `isDraft` during
            // the matching code
            $scope.populateBasicClasses(tripgj);

            // add additional data structures to make the trip gj similar to a
            // trip object so that the unified populate code works
            tripgj.start_ts = tripgj.data.properties.start_ts;
            tripgj.end_ts = tripgj.data.properties.end_ts;
            tripgj.inferred_labels = tripgj.data.properties.inferred_labels;
            tripgj.user_input = tripgj.data.properties.user_input;
            if (tripgj.user_input == undefined) {
                console.log("while populating trips, user_input not found", tripgj.data.properties);
            }
            $scope.labelPopulateFactory.populateInputsAndInferences(tripgj, $scope.data.unifiedConfirmsResults);
            $scope.populateCommonInfo(tripgj);
          });
          if ($rootScope.displayingIncident) {
            $ionicScrollDelegate.scrollBottom(true);
            $rootScope.displayingIncident = false;
          } else {
              $ionicScrollDelegate.scrollTop(true);
          }
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
                $scope.populateCommonInfo(tripWrapper);
             });
          };
      });
    });

    var showNoTripsAlert = function() {
      var buttons = [{
          text: 'New',
          type: 'button-balanced',
          onTap: function (e) {
            $state.go('root.main.recent.log');
          }
        },
        {
          text: 'Force',
          type: 'button-balanced',
          onTap: function (e) {
            $state.go('root.main.control');
          }
        },
        {
          text: 'OK',
          type: 'button-balanced',
          onTap: function (e) {
            return;
          }
        },
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
       readAndUpdateForDay(Timeline.data.currDay);
    };

    $scope.makeCurrent = function() {
      $ionicPopup.alert({
        template: "Coming soon, after Shankari's quals in early March!"
      });
    }

    // Tour steps
    var tour = {
      config: {
        mask: {
          visibleOnNoTarget: true,
          clickExit: true,
        },
        previousText: $translate.instant('tour-previous'),
        nextText: $translate.instant('tour-next'),
        finishText: $translate.instant('tour-finish')
      },
      steps: [{
        target: '#date-picker-button',
        content: $translate.instant('list-tour-datepicker-button')
      },
      {
        target: '.diary-entry',
        content: $translate.instant('list-tour-diary-entry')
      },
      {
        target: '#map-fix-button',
        content: $translate.instant('list-tour-diary-entry')
        }
      ]
    };

    var startWalkthrough = function () {
      nzTour.start(tour).then(function(result) {
        Logger.log("list walkthrough start completed, no error");
      }).catch(function(err) {
        Logger.displayError("list walkthrough start errored", err);
      });
    };

    $scope.increaseHeight = function () {
        // let's increase by a small amount to workaround the issue with the
        // card not resizing the first time
        $scope.itemHt = $scope.itemHt + 5;
        const oldDisplayTrips = $scope.data.currDayTripWrappers;
        const TEN_MS = 10;
        $scope.data.currDayTripWrappers = [];
        $timeout(() => {
            $scope.$apply(() => {
                // make sure that the new item-height is calculated by resetting the list
                // that we iterate over
                $scope.data.currDayTripWrappers = oldDisplayTrips;
                // make sure that the cards within the items are set to the new
                // size. Apparently, `ng-style` is not recalulated although the
                // variable has changed and the items have changed.
                $(".list-card").css("height", $scope.itemHt + "px");
           });
        }, TEN_MS);
    };


    /*
    * Checks if it is the first time the user has loaded the diary tab. If it is then
    * show a walkthrough and store the info that the user has seen the tutorial.
    */
    var checkDiaryTutorialDone = function () {
      var DIARY_DONE_KEY = 'diary_tutorial_done';
      var diaryTutorialDone = KVStore.getDirect(DIARY_DONE_KEY);
      if (!diaryTutorialDone) {
        startWalkthrough();
        KVStore.set(DIARY_DONE_KEY, true);
      }
    };

    $scope.startWalkthrough = function () {
      startWalkthrough();
    }

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

    $scope.showModes = DiaryHelper.showModes;

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
      $ionicPlatform.ready().then(function() {
          $scope.checkTripState();
          return in_trip;
      });
    };

    $scope.recomputeDisplayTrips = function() {
        console.log("recomputing is a NOP on the diary since we always show all trips");
    };

    $ionicPlatform.ready().then(function() {
      readAndUpdateForDay(moment().startOf('day'));

      $scope.$on('$ionicView.enter', function(ev) {
        $scope.startTime = moment().utc()
        // Workaround from
        // https://github.com/driftyco/ionic/issues/3433#issuecomment-195775629
        if(ev.targetScope !== $scope)
          return;
        checkDiaryTutorialDone();
      });

      $scope.$on('$ionicView.leave',function() {
        var timeOnPage = moment().utc() - $scope.startTime;
        ClientStats.addReading(ClientStats.getStatKeys().DIARY_TIME, timeOnPage);
      });
  
      $ionicPlatform.on("pause", function() {
        if ($state.$current == "root.main.diary.list") {
          var timeOnPage = moment().utc() - $scope.startTime;
          ClientStats.addReading(ClientStats.getStatKeys().DIARY_TIME, timeOnPage);
        }
      })

      $ionicPlatform.on("resume", function() {
        if ($state.$current == "root.main.diary.list") {
          $scope.startTime = moment().utc()
        }
      })

      $scope.$on('$ionicView.afterEnter', function() {
        ClientStats.addEvent(ClientStats.getStatKeys().CHECKED_DIARY).then(function() {
           console.log("Added "+ClientStats.getStatKeys().CHECKED_DIARY+" event");
        });
        /*
         In case we have set the labels in the label screen, we want them to
         show up when we come to this screen. It is really hard to do this
         using the original code, because the unification is not complete, and
         the code to read the manual inputs is completely different.
         Instead, let's find the corresponding trip from the label view and
         copy over the `userInput` (and potentially the `user_input`) values over
         */
        $scope.$apply(() => {
            if ($scope.data && $scope.data.currDayTripWrappers) {
                $scope.data.currDayTripWrappers.forEach(function(tripgj, tripIndex, array) {
                    let tripFromLabel = Timeline.getConfirmedTrip(tripgj.data.id);
                    // Should we just copy over the entry from the label screen
                    // NO, what if the user changed the labels here, then went to
                    // the profile and came back. Don't want to lose the upgraded entries
                    $scope.labelPopulateFactory.copyInputIfNewer(tripFromLabel, tripgj);
                });
            } else {
                console.log("No trips loaded yet, no inputs to copy over");
            }
        });
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
        }
      });
    });
});
