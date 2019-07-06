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
                                      'ng-walkthrough', 'nzTour',
                                      'emission.plugin.kvstore',
                                      'emission.plugin.logger', 'ion-autocomplete'
  ])

.controller("DiaryListCtrl", function($window, $scope, $rootScope, $ionicPlatform, $state,
                                    $ionicScrollDelegate, $ionicPopup,
                                    $ionicLoading,
                                    $ionicActionSheet,
                                    ionicDatePicker,
                                    leafletData, Timeline, CommonGraph, DiaryHelper,
    Config, PostTripManualMarker, ConfirmHelper, nzTour, KVStore, Logger, UnifiedDataLoader, $ionicPopover, $http) {
  console.log("controller DiaryListCtrl called");
    var DESTINATION_CONFIRM_KEY = "manual/destination_confirm";
    var PURPOSE_CONFIRM_KEY = "manual/purpose_confirm";
    var NOT_A_SERVICE_ENTRY = {"text": "Not a service", "value": "not_a_service", "rating": 0}
    var OTHER_ENTRY = {"text": "Other", "value": "other_mode", "rating": 0}

  // Add option

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

    $scope.addModeEntry = function(tripgj, userModeEntry) {
      tripgj.modeOptions.push(userModeEntry);
      tripgj.value2entryMode[userModeEntry.value] = userModeEntry;
      tripgj.text2entryMode[userModeEntry.text] = userModeEntry;
    };

    /**
     * Embed 'mode' to the trip
     */
    $scope.populateModeFromTimeline = function (tripgj, modeList) {
        var userMode = DiaryHelper.getUserInputForTrip(tripgj.data.properties, modeList);
        tripgj.modeOptions = tripgj.data.destination_candidates.map(function(c) {
            return {"text": c.name, "value": c.alias, "rating": c.rating}
        });
        tripgj.modeOptions.push(OTHER_ENTRY);
        tripgj.modeOptions.push(NOT_A_SERVICE_ENTRY);
        var modeMaps = arrayToMap(tripgj.modeOptions);
        tripgj.text2entryMode = modeMaps[0];
        tripgj.value2entryMode = modeMaps[1];
        if (angular.isDefined(userMode)) {
            // userMode is a mode object with data + metadata
            // the label is the "value" from the options
            var userModeEntry = tripgj.value2entryMode[userMode.data.label];
            if (!angular.isDefined(userModeEntry)) {
             /* the selected entry is not one of the candidates
              * but it is a valid service
              * let's look up the bid manually
              * this involves making a remote call from list.js
              * but it will happen once per timeline load, and only
              * if the user manually selected a destination (~ 15% of the time)
              */
              $scope.getOtherEntry(userMode.data.label).then(function(text2val) {
                userModeEntry = text2val;
                $scope.addModeEntry(tripgj, text2val);
                tripgj.usermode = userModeEntry;
              });
            } else {
                console.log("Mapped label "+userMode.data.label+" to entry "+JSON.stringify(userModeEntry));
                tripgj.usermode = userModeEntry;
            }
        }
        Logger.log("Set mode" + JSON.stringify(userModeEntry) + " for trip id " + JSON.stringify(tripgj.data.id));
        $scope.modeTripgj = angular.undefined;
    }

    /**
     * Embed 'purpose' to the trip
     */
    $scope.populatePurposeFromTimeline = function (tripgj, purposeList) {
        var userPurpose = DiaryHelper.getUserInputForTrip(tripgj.data.properties, purposeList);
        if (angular.isDefined(userPurpose)) {
            // userPurpose is a purpose object with data + metadata
            // the label is the "value" from the options
            var userPurposeEntry = $scope.value2entryPurpose[userPurpose.data.label];
            if (!angular.isDefined(userPurposeEntry)) {
              userPurposeEntry = ConfirmHelper.getFakeEntry(userPurpose.data.label);
              $scope.purposeOptions.push(userPurposeEntry);
              $scope.value2entryPurpose[userPurpose.data.label] = userPurposeEntry;
            }
            console.log("Mapped label "+userPurpose.data.label+" to entry "+JSON.stringify(userPurposeEntry));
            tripgj.userpurpose = userPurposeEntry;
        }
        Logger.log("Set purpose " + JSON.stringify(userPurposeEntry) + " for trip id " + JSON.stringify(tripgj.data.id));
        $scope.purposeTripgj = angular.undefined;
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
        template: "This trip has not yet been analysed. If it stays in this state, please ask your sysadmin to check what is wrong."
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

          $scope.data.currDayTripWrappers.forEach(function(tripgj, index, array) {
            $scope.populateModeFromTimeline(tripgj, $scope.data.unifiedConfirmsResults.modes);
            $scope.populatePurposeFromTimeline(tripgj, $scope.data.unifiedConfirmsResults.purposes);
            $scope.populateBasicClasses(tripgj);
            $scope.populateCommonInfo(tripgj);
          });
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
                $scope.populateCommonInfo(tripWrapper);
             });
          };
      });
    });

    $scope.setColor = function(mode) {
      var colors = {
        "icon ion-android-bicycle": 'green',
    "icon ion-android-walk":'brown',
    "icon ion-speedometer":'purple',
    "icon ion-android-bus": "purple",
    "icon ion-android-train": "navy",
    "icon ion-android-car": "salmon",
        "icon ion-plane": "red"
      };
      return {
        color: colors[mode]
      };
    }

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
      $ionicPopup.alert({
        template: "Coming soon, after Shankari's quals in early March!"
      });
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
        content: 'Click on the map to see more details about each trip.'
      },
      {
        target: '#map-fix-button',
        content: 'Use this to fix the map tiles if they have not loaded properly.'
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
      var userMode = param.usermode;
      if (angular.isDefined(userMode)) {
        $state.go('root.main.diary-detail', {
          tripId: param.data.id //tripgj.data.id
        });
      } else {

      }
    };

    $scope.showModes = DiaryHelper.showModes;

    $scope.readAndFormatCandidates = function(tripgj) {
        var RADIUS = 250; // meters
        var SEARCH_LIMIT = 3; // top 3 entries
        $ionicLoading.show({
          template: 'Loading candidates...'
        });
        // geometry coordinates are in the order [lat, lng]
        var url_params = {
            'latitude': tripgj.end_place.geometry.coordinates[1],
            'longitude': tripgj.end_place.geometry.coordinates[0],
            'radius' : RADIUS,
            'limit': SEARCH_LIMIT,
            'sort_by': 'distance',
            'categories' : 'food,restaurants,shopping,hotels,beautysvc,auto,education,collegeuniv,financialservices,publicservicesgovt'
        };
        return $http({
          "async": true,
          "crossDomain": true,
          "url": "https://api.yelp.com/v3/businesses/search",
          "method": "GET",
          "headers": $scope.yelp.headers,
          "params": url_params
        }).then(function(result) {
          $ionicLoading.hide();
          return result.data.businesses;
        }).catch(function(err) {
          Logger.displayError("Error while retrieving candidate destinations", err);
          $ionicLoading.hide();
        });
    };

    $ionicPopover.fromTemplateUrl('templates/diary/mode-popover.html', {
      scope: $scope
    }).then(function (popover) {
      $scope.modePopover = popover;
    });

    $scope.openModePopover = function ($event, tripgj) {
      var userMode = tripgj.usermode;
      if (angular.isDefined(userMode)) {
        $scope.selected.mode.value = userMode.value;
      } else {
        $scope.selected.mode.value = '';
      }
      $scope.draftMode = {
        "start_ts": tripgj.data.properties.start_ts,
        "end_ts": tripgj.data.properties.end_ts
      };
      $scope.modeTripgj = tripgj;
      $scope.modeOptions = tripgj.modeOptions;
      $scope.value2entryMode = tripgj.value2entryMode;
      Logger.log("in openModePopover, setting draftMode = " + JSON.stringify($scope.draftMode));
      $ionicPopover.fromTemplateUrl('templates/diary/mode-popover.html', {
          scope: $scope
      }).then(function (popover) {
        $scope.modePopover = popover;
        $scope.modePopover.show($event);
      });
    };

    var closeModePopover = function ($event, isOther) {
      $scope.selected.mode = {
        value: ''
      };
      if (isOther == false) {
        $scope.draftMode = angular.undefined;
        $scope.modeOptions = angular.undefined;
        $scope.value2entryMode = angular.undefined;
      }
      Logger.log("in closeModePopover, setting draftMode = " + JSON.stringify($scope.draftMode));
      $scope.modePopover.hide($event);
    };

    $ionicPopover.fromTemplateUrl('templates/diary/purpose-popover.html', {
      scope: $scope
    }).then(function (popover) {
      $scope.purposePopover = popover;
    });

    $scope.openPurposePopover = function ($event, tripgj) {
      var userPurpose = tripgj.userpurpose;
      if (angular.isDefined(userPurpose)) {
        $scope.selected.purpose.value = userPurpose.value;
      } else {
        $scope.selected.purpose.value = '';
      }

      $scope.draftPurpose = {
        "start_ts": tripgj.data.properties.start_ts,
        "end_ts": tripgj.data.properties.end_ts
      };
      $scope.purposeTripgj = tripgj;
      Logger.log("in openPurposePopover, setting draftPurpose = " + JSON.stringify($scope.draftPurpose));
      $scope.purposePopover.show($event);
    };

    var closePurposePopover = function ($event, isOther) {
      $scope.selected.purpose = {
        value: ''
      };
      if (isOther == false)
        $scope.draftPurpose = angular.undefined;
      Logger.log("in closePurposePopover, setting draftPurpose = " + JSON.stringify($scope.draftPurpose));
      $scope.purposePopover.remove($event);
    };

    /**
     * Store selected value for options
     * $scope.selected is for display purpose only
     * the value is displayed on popover selected option
     */
    $scope.selected = {
      mode: {
        value: ''
      },
      other: {
        text: '',
        value: ''
      },
      purpose: {
        value: ''
      },
    };

    /*
     * This is a curried function that curries the `$scope` variable
     * while returing a function that takes `e` as the input
     */
    var checkOtherOptionOnTap = function ($scope, choice) {
        return function (e) {
          if (!$scope.selected.other.text) {
            e.preventDefault();
          } else {
            Logger.log("in choose other, other = " + JSON.stringify($scope.selected));
            if (choice.value == 'other_mode') {
              $scope.storeMode($scope.selected.other, true /* isOther */);
              $scope.selected.other = '';
            } else if (choice.value == 'other_purpose') {
              $scope.storePurpose($scope.selected.other, true /* isOther */);
              $scope.selected.other = '';
            }
            return $scope.selected.other;
          }
        }
    };

    $scope.choosePurpose = function () {
      var isOther = false;
      if ($scope.selected.purpose.value != "other_purpose") {
        $scope.storePurpose($scope.selected.purpose, isOther);
      } else {
        isOther = true
        ConfirmHelper.checkOtherOption($scope.selected.purpose, checkOtherOptionOnTap, $scope);
      }
      closePurposePopover();
    };

    $scope.chooseMode = function () {
      var isOther = false
      if ($scope.selected.mode.value != "other_mode") {
        $scope.storeMode($scope.selected.mode, isOther);
      } else {
        isOther = true
        $scope.launchAutocompletePopup();
        // ConfirmHelper.checkOtherOption($scope.selected.mode, checkOtherOptionOnTap, $scope);
      }
      closeModePopover();
    };

    $scope.launchAutocompletePopup = function() {
        var ionAutocompleteElement = document.getElementsByClassName("ion-autocomplete");
        angular.element(ionAutocompleteElement).controller('ionAutocomplete').fetchSearchQuery("", true);
        angular.element(ionAutocompleteElement).controller('ionAutocomplete').showModal();
    }

    $scope.chooseTypedMode = function (callback) {
       // We used to use a $scope variable to represent the callback, but that
       // seems to be updated in a delayed fashion - e.g. if I select Thaiphoon,
       // then the scope variable is set to "". but if I open the popup again
       // and then select "Kaplan's Test Prep" then the $scope variable is set
       // to "Thaiphoon". See video in associated PR.
       // so we just use the selected value instead
       console.log("choose typed mode with id "+callback.item.id
        +" for trip "+$scope.modeTripgj);
       // Note that on typing, autocomplete returns an id and not the alias.
       // however, fortunately, the API call to lookup the business works with
       // both id and alias
       return $scope.getOtherEntry(callback.item.id).then(function(text2val) {
         // text2val is now text: name, value: alias
         $scope.storeMode(text2val, true); // isOther = true
       });
    };

    /*
     * Convert the array of {text, value} objects to a {value: text} map so that 
     * we can look up quickly without iterating over the list for each trip
     */

    var arrayToMap = function(optionsArray) {
        var text2entryMap = {};
        var value2entryMap = {};

        optionsArray.forEach(function(text2val) {
            text2entryMap[text2val.text] = text2val;
            value2entryMap[text2val.value] = text2val;
        });
        return [text2entryMap, value2entryMap];
    }

    $scope.$on('$ionicView.loaded', function() {
        ConfirmHelper.getModeOptions().then(function(modeOptions) {
            $scope.modeOptions = modeOptions;
            var modeMaps = arrayToMap($scope.modeOptions);
            $scope.text2entryMode = modeMaps[0];
            $scope.value2entryMode = modeMaps[1];
        });
        ConfirmHelper.getPurposeOptions().then(function(purposeOptions) {
            $scope.purposeOptions = purposeOptions;
            var purposeMaps = arrayToMap($scope.purposeOptions);
            $scope.text2entryPurpose = purposeMaps[0];
            $scope.value2entryPurpose = purposeMaps[1];
        });
    });

    $scope.storeMode = function (mode, isOther) {
      $scope.draftMode.label = mode.value;
      Logger.log("in storeMode, after setting mode.value = " + mode.value + ", draftMode = " + JSON.stringify($scope.draftMode));
      var tripToUpdate = $scope.modeTripgj;
      Timeline.instantSave(DESTINATION_CONFIRM_KEY, $scope.draftMode).then(function () {
        // in this callback we will use the curried value of tripToUpdate
        $scope.$apply(function() {
          if (isOther) {
            $scope.addModeEntry(tripToUpdate, mode);
            tripToUpdate.usermode = tripToUpdate.value2entryMode[mode.value];
          } else {
            Logger.log("picked shop here !!!")
            tripToUpdate.usermode = tripToUpdate.value2entryMode[mode.value];
          }
        });
      }).catch(function(error) {
          Logger.displayError("Error while saving mode information", error);
      });
      if (isOther == true) {
        $scope.draftMode = angular.undefined;
        $scope.modeOptions = angular.undefined;
        $scope.value2entryMode = angular.undefined;
      }
    }

    $scope.storePurpose = function (purpose, isOther) {
      if (isOther) {
        purpose.value = ConfirmHelper.otherTextToValue(purpose.text);
      }
      $scope.draftPurpose.label = purpose.value;
      Logger.log("in storePurpose, after setting purpose.value = " + purpose.value + ", draftPurpose = " + JSON.stringify($scope.draftPurpose));
      var tripToUpdate = $scope.purposeTripgj;
      $window.cordova.plugins.BEMUserCache.putMessage(PURPOSE_CONFIRM_KEY, $scope.draftPurpose).then(function () {
        $scope.$apply(function() {
          if (isOther) {
            tripToUpdate.userpurpose = ConfirmHelper.getFakeEntry(purpose.value);
            $scope.purposeOptions.push(tripToUpdate.userpurpose);
            $scope.value2entryPurpose[purpose.value] = tripToUpdate.userpurpose;
          } else {
            tripToUpdate.userpurpose = $scope.value2entryPurpose[purpose.value];
          }
        });
      });
      if (isOther == true)
        $scope.draftPurpose = angular.undefined;
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

    $http.get('json/yelpfusion.json').then(function(result) {
      $scope.yelp = result.data;
    });

    $scope.getOtherEntry = function(other_bid) {
        var RADIUS = 250; // meters
        var SEARCH_LIMIT = 3; // top 3 entries
        // geometry coordinates are in the order [lat, lng]
        return $http({
          "async": true,
          "crossDomain": true,
          "url": "https://api.yelp.com/v3/businesses/"+other_bid,
          "method": "GET",
          "headers": $scope.yelp.headers
        }).then(function(result) {
          return {"text": result.data.name, "value": result.data.alias, "rating": result.data.rating};
        }).catch(function(err) {
          Logger.displayError("Error while retrieving candidate destinations", err);
        });
    };

    $scope.queryByName = function(query, tripgj) {
        console.log("About to query for "+query);
        if (query) {
            var tripToUpdate = tripgj;
            // geometry coordinates are in the order [lat, lng]
            var url_params = {
                'latitude': tripToUpdate.data.properties.end_loc.coordinates[1],
                'longitude': tripToUpdate.data.properties.end_loc.coordinates[0],
                'text' : query,
            };
            return $http({
              "async": true,
              "crossDomain": true,
              "url": "https://api.yelp.com/v3/autocomplete",
              "method": "GET",
              "headers": $scope.yelp.headers,
              "params": url_params
            }).then(function(result) {
              console.log("Got result "+JSON.stringify(result.data.businesses));
              return result.data.businesses;
            }).catch(function(err) {
              Logger.displayError("Error while retrieving candidate destinations", err);
            });
        }
        return []
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
          $rootScope.displayingIncident = false;
        }
      });
    });
});
