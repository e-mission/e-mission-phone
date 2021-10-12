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
                                      'emission.incident.posttrip.manual',
                                      'emission.tripconfirm.services',
                                      'emission.services',
                                      'ng-walkthrough', 'nzTour', 'emission.plugin.kvstore',
    'emission.plugin.logger'
  ])

.controller("DiaryListCtrl", function($window, $scope, $rootScope, $ionicPlatform, $state,
                                    $ionicScrollDelegate, $ionicPopup,
                                    $ionicLoading,
                                    $ionicActionSheet,
                                    ionicDatePicker,
                                    leafletData, Timeline, CommonGraph, DiaryHelper,
    Config, PostTripManualMarker, ConfirmHelper, nzTour, KVStore, Logger, UnifiedDataLoader, $ionicPopover, $translate) {
  console.log("controller DiaryListCtrl called");
  // Add option

  $scope.$on('leafletDirectiveMap.resize', function(event, data) {
      console.log("diary/list received resize event, invalidating map size");
      data.leafletObject.invalidateSize();
  });

  $scope.userInputDetails = [];
  ConfirmHelper.INPUTS.forEach(function(item, index) {
    const currInput = angular.copy(ConfirmHelper.inputDetails[item]);
    currInput.name = item;
    $scope.userInputDetails.push(currInput);
  });

  var readAndUpdateForDay = function(day) {
    // This just launches the update. The update can complete in the background
    // based on the time when the database finishes reading.
    // TODO: Convert the usercache calls into promises so that we don't have to
    // do this juggling
    Timeline.updateForDay(day);
    // This will be used to show the date of datePicker in the user language.
    $scope.currDay = moment(day).format('LL');
    // CommonGraph.updateCurrent();
  };

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

    /**
     * Embed 'inputType' to the trip
     */
    $scope.populateInputFromTimeline = function (tripgj, nextTripgj, inputType, inputList) {
        var userInput = DiaryHelper.getUserInputForTrip(tripgj, nextTripgj, inputList);
        if (angular.isDefined(userInput)) {
            // userInput is an object with data + metadata
            // the label is the "value" from the options
            var userInputEntry = $scope.inputParams[inputType].value2entry[userInput.data.label];
            if (!angular.isDefined(userInputEntry)) {
              userInputEntry = ConfirmHelper.getFakeEntry(userInput.data.label);
              $scope.inputParams[inputType].options.push(userInputEntry);
              $scope.inputParams[inputType].value2entry[userInput.data.label] = userInputEntry;
            }
            console.log("Mapped label "+userInput.data.label+" to entry "+JSON.stringify(userInputEntry));
            tripgj.userInput[inputType] = userInputEntry;
        }
        Logger.log("Set "+ inputType + " " + JSON.stringify(userInputEntry) + " for trip id " + JSON.stringify(tripgj.data.id));
        $scope.editingTrip = angular.undefined;
    }

    $scope.populateBasicClasses = function(tripgj) {
        tripgj.display_start_time = DiaryHelper.getLocalTimeString(tripgj.data.properties.start_local_dt);
        tripgj.display_end_time = DiaryHelper.getLocalTimeString(tripgj.data.properties.end_local_dt);
        tripgj.display_distance = $scope.getFormattedDistance(tripgj.data.properties.distance);
        tripgj.display_time = $scope.getFormattedTimeRange(tripgj.data.properties.start_ts,
                                tripgj.data.properties.end_ts);
        tripgj.isDraft = $scope.isDraft(tripgj);
        tripgj.background = DiaryHelper.getTripBackground(tripgj);
        tripgj.listCardClass = $scope.listCardClass(tripgj);
        tripgj.percentages = $scope.getPercentages(tripgj)
    }

    $scope.populateCommonInfo = function(tripgj) {
        tripgj.common = {}
        DiaryHelper.fillCommonTripCount(tripgj);
        tripgj.common.different = $scope.differentCommon(tripgj);
        tripgj.common.longerOrShorter = $scope.getLongerOrShorter(tripgj.data, tripgj.data.id);
        tripgj.common.listColLeftClass = $scope.listColLeftClass(tripgj.common.longerOrShorter[0]);
        tripgj.common.stopTimeTagClass = $scope.stopTimeTagClass(tripgj);
        tripgj.common.arrowColor = $scope.arrowColor(tripgj.common.longerOrShorter[0]);
        tripgj.common.arrowClass = $scope.getArrowClass(tripgj.common.longerOrShorter[0]);

        tripgj.common.earlierOrLater = $scope.getEarlierOrLater(tripgj.data.properties.start_ts, tripgj.data.id);
        tripgj.common.displayEarlierLater = $scope.parseEarlierOrLater(tripgj.common.earlierOrLater);
    }

    var isNotEmpty = function (obj) {
      for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
          return true;
      }
      return false;
    };

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

          $scope.data.currDayTripWrappers.forEach(function(tripgj, tripIndex, array) {
            tripgj.userInput = {};
            ConfirmHelper.INPUTS.forEach(function(item, index) {
                $scope.populateInputFromTimeline(tripgj, array[tripIndex+1], item, $scope.data.unifiedConfirmsResults[item]);
            });
            $scope.populateBasicClasses(tripgj);
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
      if ($ionicScrollDelegate.getScrollPosition().top < 20) {
       readAndUpdateForDay(Timeline.data.currDay);
       $scope.$broadcast('invalidateSize');
      }
    };

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
      $ionicPopup.alert({
        template: "Coming soon, after Shankari's quals in early March!"
      });
    }

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

    $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
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

    $scope.toDetail = function (param) {
      $state.go('root.main.diary-detail', {
        tripId: param
      });
    };

    $scope.showModes = DiaryHelper.showModes;

    $scope.popovers = {};
    ConfirmHelper.INPUTS.forEach(function(item, index) {
        let popoverPath = 'templates/diary/'+item.toLowerCase()+'-popover.html';
        return $ionicPopover.fromTemplateUrl(popoverPath, {
          scope: $scope
        }).then(function (popover) {
          $scope.popovers[item] = popover;
        });
    });

    $scope.openPopover = function ($event, tripgj, inputType) {
      var userInput = tripgj.userInput[inputType];
      if (angular.isDefined(userInput)) {
        $scope.selected[inputType].value = userInput.value;
      } else {
        $scope.selected[inputType].value = '';
      }
      $scope.draftInput = {
        "start_ts": tripgj.data.properties.start_ts,
        "end_ts": tripgj.data.properties.end_ts
      };
      $scope.editingTrip = tripgj;
      Logger.log("in openPopover, setting draftInput = " + JSON.stringify($scope.draftInput));
      $scope.popovers[inputType].show($event);
    };

    var closePopover = function (inputType) {
      $scope.selected[inputType] = {
        value: ''
      };
      $scope.popovers[inputType].hide();
    };

    /**
     * Store selected value for options
     * $scope.selected is for display only
     * the value is displayed on popover selected option
     */
    $scope.selected = {}
    ConfirmHelper.INPUTS.forEach(function(item, index) {
        $scope.selected[item] = {value: ''};
    });
    $scope.selected.other = {text: '', value: ''};

    /*
     * This is a curried function that curries the `$scope` variable
     * while returing a function that takes `e` as the input
     */
    var checkOtherOptionOnTap = function ($scope, inputType) {
        return function (e) {
          if (!$scope.selected.other.text) {
            e.preventDefault();
          } else {
            Logger.log("in choose other, other = " + JSON.stringify($scope.selected));
            $scope.store(inputType, $scope.selected.other, true /* isOther */);
            $scope.selected.other = '';
            return $scope.selected.other;
          }
        }
    };

    $scope.choose = function (inputType) {
      var isOther = false
      if ($scope.selected[inputType].value != "other") {
        $scope.store(inputType, $scope.selected[inputType], isOther);
      } else {
        isOther = true
        ConfirmHelper.checkOtherOption(inputType, checkOtherOptionOnTap, $scope);
      }
      closePopover(inputType);
    };

    $scope.$on('$ionicView.loaded', function() {
        $scope.inputParams = {}
        ConfirmHelper.INPUTS.forEach(function(item) {
            ConfirmHelper.getOptionsAndMaps(item).then(function(omObj) {
                $scope.inputParams[item] = omObj;
            });
        });
    });

    $scope.store = function (inputType, input, isOther) {
      if(isOther) {
        // Let's make the value for user entered inputs look consistent with our
        // other values
        input.value = ConfirmHelper.otherTextToValue(input.text);
      }
      $scope.draftInput.label = input.value;
      Logger.log("in storeInput, after setting input.value = " + input.value + ", draftInput = " + JSON.stringify($scope.draftInput));
      var tripToUpdate = $scope.editingTrip;
      $window.cordova.plugins.BEMUserCache.putMessage(ConfirmHelper.inputDetails[inputType].key, $scope.draftInput).then(function () {
        $scope.$apply(function() {
          if (isOther) {
            tripToUpdate.userInput[inputType] = ConfirmHelper.getFakeEntry(input.value);
            $scope.inputParams[inputType].options.push(tripToUpdate.userInput[inputType]);
            $scope.inputParams[inputType].value2entry[input.value] = tripToUpdate.userInput[inputType];
          } else {
            tripToUpdate.userInput[inputType] = $scope.inputParams[inputType].value2entry[input.value];
          }
        });
      });
      if (isOther == true)
        $scope.draftInput = angular.undefined;
    }

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

    $ionicPlatform.ready().then(function() {
      readAndUpdateForDay(moment().startOf('day'));

      $scope.$on('$ionicView.enter', function(ev) {
        // Workaround from
        // https://github.com/driftyco/ionic/issues/3433#issuecomment-195775629
        if(ev.targetScope !== $scope)
          return;
        checkDiaryTutorialDone();
      });

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
        }
      });
    });
});
