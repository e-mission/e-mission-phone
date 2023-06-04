'use strict';

/*
 * The general structure of this code is that all the timeline information for
 * a particular day is retrieved from the Timeline factory and put into the scope.
 * For best performance, all data should be loaded into the in-memory timeline,
 * and in addition to writing to storage, the data should be written to memory.
 * All UI elements should only use $scope variables.
 */

import angular from 'angular';
import Bottleneck from 'bottleneck';
import { invalidateMaps } from './LeafletView';

angular.module('emission.main.diary.infscrolllist',[
                                      'ionic-datepicker',
                                      'emission.appstatus.permissioncheck',
                                      'emission.services',
                                      'emission.config.imperial',
                                      'emission.config.dynamic',
                                      'emission.splash.notifscheduler',
                                      'emission.survey',
                                      'emission.plugin.kvstore',
                                      'emission.stats.clientstats',
                                      'emission.plugin.logger',
                                      'emission.main.diary.infscrolltripitem',
                                      'emission.main.diary.infscrollplaceitem',
                                      'emission.main.diary.infscrolluntrackedtimeitem',
                                    ])

.controller("InfiniteDiaryListCtrl", function($window, $scope, $rootScope, $injector,
                                    $ionicPlatform, $state,
                                    $ionicScrollDelegate, $ionicPopup, ClientStats,
                                    $ionicLoading,
                                    $ionicActionSheet,
                                    ionicDatePicker,
                                    $timeout,
                                    Timeline, DiaryHelper,
                                    SurveyOptions, NotificationScheduler,
                                    ImperialConfig, DynamicConfig,
                                    KVStore,
                                    Logger, UnifiedDataLoader, InputMatcher,
                                    $ionicModal) {
  
  // TODO: load only a subset of entries instead of everything

  console.log("controller InfiniteDiaryListCtrl called");
  const DEFAULT_ITEM_HT = 274;
  $scope.itemHt = DEFAULT_ITEM_HT;

  const placeLimiter = new Bottleneck({ maxConcurrent: 2, minTime: 500 });
  $scope.data = {};

  $scope.init = (configObj) => {
    $scope.$apply(() => {
      $scope.ui_config = configObj;
      const surveyOptKey = configObj.survey_info['trip-labels'];
      $scope.surveyOpt = SurveyOptions[surveyOptKey];
      console.log('surveyOpt in infinite_scroll_list.js is', $scope.surveyOpt);
      $scope.showPlaces = configObj.survey_info?.buttons?.['place-notes'];
      $scope.labelPopulateFactory = $injector.get($scope.surveyOpt.service);
      $scope.enbs = $injector.get("EnketoNotesButtonService");
      const tripSurveyName = configObj.survey_info?.buttons?.['trip-notes']?.surveyName;
      const placeSurveyName = configObj.survey_info?.buttons?.['place-notes']?.surveyName;
      $scope.enbs.initConfig(tripSurveyName, placeSurveyName);
    });
    $scope.checkPermissionsStatus();
    // we will show filters if 'additions' are not configured
    // https://github.com/e-mission/e-mission-docs/issues/894
    if (configObj.survey_info?.buttons == undefined) {
      $scope.initFilters();
    }
    $scope.setupInfScroll();
  };

  $scope.initFilters = function() {
    $scope.tripFilterFactory = $injector.get($scope.surveyOpt.filter);
    $scope.filterInputs = $scope.tripFilterFactory.configuredFilters;
    $scope.filterInputs.forEach((f) => {
      f.state = false;
    });
    $scope.filterInputs[0].state = true;
    $scope.selFilter = $scope.filterInputs[0].key;
    ClientStats.addReading(ClientStats.getStatKeys().LABEL_TAB_SWITCH, {"source": null, "dest": $scope.getActiveFilters()});
  }

  $scope.checkPermissionsStatus = () => {
    $scope.$broadcast("recomputeAppStatus", (status) => {
      if (!status) {
        $ionicPopup.show({
          title: i18next.t('control.incorrect-app-status'),
          template: i18next.t('control.fix-app-status'),
          scope: $scope,
          buttons: [{
            text: i18next.t('control.fix'),
            type: 'button-assertive',
            onTap: function(e) {
              $state.go('root.main.control', {launchAppStatusModal: 1});
              return false;
            }
          }]
        });
      }
    });
  }

  $scope.getCardHeight = function(entry) {
    if (entry=='header' || entry=='footer') return 40;
    let height = 15; // 15 pixels of padding to account for iOS/Android rendering differences
    if (entry.origin_key.includes('place')) {
      height += 164;
    } else if (entry.origin_key.includes('untracked')) {
      height += 155;
    } else if (entry.origin_key.includes('trip')) {
      // depending on if ENKETO or MULTILABEL is set, or what mode is chosen,
      // we may have 1, 2, or 3 buttons at any given time
      // 242 is the height without any buttons, and each button adds 54 pixels
      const numButtons = entry.INPUTS?.length || 1;
      height += 236 + (54 * numButtons)
    }

    if (entry.additionsList) {
      height += 5 + 30 * entry.additionsList.length; // for each trip/place addition object, we need to increase the card height
    }
    return height;
  }

  $scope.getActiveFilters = function() {
    return $scope.filterInputs.filter(sf => sf.state).map(sf => sf.key);
  }
  const ONE_WEEK = 7 * 24 * 60 * 60; // seconds
  const ONE_DAY = 24 * 60 * 60; // seconds

  /*
   * These values are used to ensure that when the user scrolls upwards, they
   * end up at the same location as they were. Since we now add entries to the
   * top of the list, without these changes, as we load more entries, we will
   * see the top of the new entries and will potentially have to scroll down to
   * find where we originally were.
   * That is not terrible, but it is also not super intuitive. This keeps track
   * of where we were from the bottom and scrolls back to that location after
   * the data is loaded and the infiniteScrollCallback is broadcast.
   *
   * We need to define and store the callback since we want to scroll *after*
   * the new items have been fully added (i.e. in the `$scope.$on`). If the
   * focus group is ok with seeing the newly loaded trips first, we can
   * simplify this.
   */
  $scope.infScrollControl = {fromBottom: -1, callback: undefined};

  var adjustScrollAfterDownload = function(stayAtTop) {
    if (stayAtTop) return;
    // This whole "infinite scroll upwards" implementation is quite hacky, but after hours of work on it, it's the only way I could approximate the desired behavior.
    $ionicScrollDelegate.resize().then(() => {
      const contentHt = scrollContentHeight();
      const clientHt = $ionicScrollDelegate.getScrollView().__clientHeight;
      $ionicScrollDelegate.scrollTo(0, contentHt - clientHt);
    });
  };

  var scrollContentHeight = function() {
    let ht = 50; // start at 50 for the header
    $scope.data.listEntries.forEach((entry) => {
      ht += $scope.getCardHeight(entry);
    });
    return ht;
  }

  var getFromBottom = function() {
    return $ionicScrollDelegate.getScrollView().__contentHeight
        - $ionicScrollDelegate.getScrollPosition().top;
  }

  $scope.populateCompositeTrips = (ctList) => {
    ctList.forEach((ct, i) => {
      if ($scope.showPlaces && ct.start_confirmed_place) {
        const cp = ct.start_confirmed_place;
        cp.getNextEntry = () => ctList[i];
        $scope.populateBasicClasses(cp);
        $scope.labelPopulateFactory.populateInputsAndInferences(cp, $scope.data.manualResultMap);
        $scope.enbs.populateInputsAndInferences(cp, $scope.data.enbsResultMap);
      }
      if ($scope.showPlaces && ct.end_confirmed_place) {
        const cp = ct.end_confirmed_place;
        cp.getNextEntry = () => ctList[i + 1];
        $scope.populateBasicClasses(cp);
        $scope.labelPopulateFactory.populateInputsAndInferences(cp, $scope.data.manualResultMap);
        $scope.enbs.populateInputsAndInferences(cp, $scope.data.enbsResultMap);
        ct.getNextEntry = () => cp;
      } else {
        ct.getNextEntry = () => ctList[i + 1];
      }
      $scope.populateBasicClasses(ct);
      $scope.labelPopulateFactory.populateInputsAndInferences(ct, $scope.data.manualResultMap);
      $scope.enbs.populateInputsAndInferences(ct, $scope.data.enbsResultMap);
    });
  }

  $scope.loadWeekOfSelectedDay = () => {
    const selDay = $scope.infScrollControl.selectedDay;
    Logger.log("Called loadWeekOfSelectedDay with selectedDay = " + selDay);
    if (!selDay) return Logger.log("No selected day, early return");
    const seconds = selDay.getTime() / 1000;
    const startTs = seconds - (ONE_WEEK / 2);
    const endTs = seconds + (ONE_WEEK / 2);
    $scope.infScrollControl.reachedPipelineStart = false;
    $scope.infScrollControl.reachedPipelineEnd = false;
    $scope.data.allTrips = [];
    $scope.data.listEntries = [];
    $scope.readDataFromServer(startTs, endTs);
  }

  $scope.loadMoreTrips = (when) => {
    const oldestTs = $scope.infScrollControl.oldestLoadedTs;
    const latestTs = $scope.infScrollControl.latestLoadedTs;
    if (!angular.isDefined(oldestTs)) {
      Logger.log("trying to read data too early, early return");
      $ionicLoading.hide();
      $scope.$broadcast('scroll.infiniteScrollComplete')
      return;
    }
    if (when=='past' && !$scope.infScrollControl.reachedPipelineStart) {
      const startTs = oldestTs - ONE_WEEK;
      const endTs   = oldestTs;
      $scope.readDataFromServer(startTs, endTs, when);
    } else if (when=='future' && !$scope.infScrollControl.reachedPipelineEnd) {
      const startTs = latestTs;
      const endTs   = latestTs + ONE_WEEK;
      $scope.readDataFromServer(startTs, endTs, when);
    }
  }

  $scope.readDataFromServer = function(startTs, endTs, direction) {
    Logger.log("Called readDataFromServer");
    $scope.infScrollControl.fromBottom = getFromBottom();
    // after download, reset scroll position. if 'past', go to top, if 'future', go to bottom
    $scope.infScrollControl.callback = () => adjustScrollAfterDownload(direction=='past');
    console.log("calling readDataFromServer with "+
        JSON.stringify($scope.infScrollControl));
    const oldestTs = $scope.infScrollControl.oldestLoadedTs;
    const latestTs = $scope.infScrollControl.latestLoadedTs;
    if (!angular.isDefined(oldestTs)) {
        Logger.log("trying to read data too early, early return");
        $ionicLoading.hide();
        $scope.$broadcast('scroll.infiniteScrollComplete')
        return;
    }
    Logger.log("Turning on the ionic loading overlay in setupInfScroll");
    $ionicLoading.show({
        template: i18next.t('service.reading-server')
    });

    Logger.log("Requesting trips from server from "+moment(startTs*1000).format("YYYY-MM-DD HH:mm:ss")+" to "+moment(endTs*1000).format("YYYY-MM-DD HH:mm:ss"));

    const pipelineEnd = $scope.infScrollControl.pipelineRange.end_ts;
    const readCtPromise = Timeline.readAllCompositeTrips(startTs, endTs);
    let readUtPromise = Promise.resolve([]);
    if (endTs >= pipelineEnd) {
      const nowTs = new Date().getTime() / 1000;
      readUtPromise = Timeline.readUnprocessedTrips(pipelineEnd, nowTs, $scope.data.allTrips);
    }
    Promise.all([readCtPromise, readUtPromise]).then(([ctList, utList]) => {
        const tripsRead = ctList.concat(utList);
        Logger.log("Received batch of size "+tripsRead.length);
        $scope.populateCompositeTrips(tripsRead);
        // Fill place names and trajectories on a reversed copy of the list so we fill from the bottom up
        tripsRead.slice().reverse().forEach(function(trip, index) {
            fillPlacesForTripAsync(trip);
            fillTrajectoriesForTrip(trip);
        });
        if (direction == 'future') {
          $scope.data.allTrips = $scope.data.allTrips.concat(tripsRead);
        } else {
          $scope.data.allTrips = tripsRead.concat($scope.data.allTrips);
        }
        Logger.log("After adding batch of size "+tripsRead.length+" cumulative size = "+$scope.data.allTrips.length);
        Timeline.setInfScrollCompositeTripList($scope.data.allTrips);
        const oldestTrip = tripsRead[0];
        const [latestTrip] = tripsRead.slice(-1);
        $scope.updateTimeRange(direction, oldestTrip, latestTrip);
        $scope.recomputeListEntries();
        Logger.log("Broadcasting infinite scroll complete");
        $ionicLoading.hide();
        $scope.$broadcast('scroll.infiniteScrollComplete');

    }).catch((err) => {
        Logger.displayError("while reading confirmed trips", err);
        Logger.log("Reached the end of the scrolling");
        $scope.infScrollControl.reachedPipelineStart = true;
        Logger.log("Broadcasting infinite scroll complete");
        $ionicLoading.hide();
        $scope.$broadcast('scroll.infiniteScrollComplete');
    });
    Timeline.readUnprocessedTrips(startTs, endTs, $scope.data.allTrips).then((utList) => {
      Logger.log("Received unprocessed trip batch of size " + utList.length);
    }).catch((err) => {
      Logger.displayError("while reading unconfirmed trips", err);
    });
  };

  $scope.setupInfScroll = function() {
    Logger.log("Setting up the scrolling");
    $scope.itemHt = DEFAULT_ITEM_HT;
    $scope.infScrollControl.reachedPipelineStart = false;
    $scope.infScrollControl.reachedPipelineEnd = true;
    $scope.data.allTrips = [];
    $scope.data.listEntries = [];
    Logger.log("Turning on the ionic loading overlay in setupInfScroll");
    $ionicLoading.show({
        template: i18next.t('service.reading-server')
    });
    Timeline.getUnprocessedLabels($scope.labelPopulateFactory, $scope.enbs).then(([pipelineRange, manualResultMap, enbsResultMap]) => {
        if (pipelineRange.end_ts) {
            $scope.$apply(() => {
              $scope.data.manualResultMap = manualResultMap;
              $scope.data.enbsResultMap = enbsResultMap;
            });
            console.log("After reading in the label controller, manualResultMap "+JSON.stringify($scope.manualResultMap), $scope.data.manualResultMap);
            $scope.infScrollControl.pipelineRange = pipelineRange;
            $scope.infScrollControl.pipelineRange.start_date = moment(pipelineRange.start_ts*1000).format("YYYY-MM-DD");
            $scope.infScrollControl.pipelineRange.end_date = moment(pipelineRange.end_ts*1000).format("YYYY-MM-DD");
            $scope.infScrollControl.oldestLoadedTs = pipelineRange.end_ts;
            $scope.infScrollControl.latestLoadedTs = pipelineRange.end_ts;
            $scope.infScrollControl.callback = function() {
              $ionicScrollDelegate.scrollBottom(); // scrollTop()?
            };
            $scope.loadMoreTrips('past');
        } else {
            $scope.$apply(() => {
                $scope.infScrollControl.reachedPipelineStart = true;
            });
            $ionicLoading.hide();
            $scope.$broadcast('scroll.infiniteScrollComplete')
        }
    });
  }

  $scope.$on("recomputeListEntries", () => {
    $scope.recomputeListEntries();
  });

  $scope.$on("scrollResize", () => {
    $ionicScrollDelegate.resize();
  });

  $scope.$on("scroll.infiniteScrollComplete", function() {
    Logger.log("infiniteScrollComplete broadcast")
    if ($scope.infScrollControl.callback != undefined) {
      $scope.infScrollControl.callback();
      $scope.infScrollControl.callback = undefined;
    }
  });

  $scope.$on("enketo.noteAddition", (e, addition) => {
    $scope.$apply(() => {
      // Find the list entry that matches the addition
      const matchingTimelineEntry = $scope.data.listEntries.find((entry) => 
        InputMatcher.validUserInputForTimelineEntry(entry, addition, false)
      );
      if (!matchingTimelineEntry) {
        return Logger.displayError("Could not find matching timeline entry for addition", addition);
      }
      matchingTimelineEntry.additionsList ||= [];
      matchingTimelineEntry.additionsList.push(addition);
      $ionicScrollDelegate.resize();
    })
  });

  $scope.updateFilterSel = function(selFilterKey) {
    const prev = $scope.getActiveFilters();
    const selFilter = $scope.filterInputs.find(f => f.key == selFilterKey);
    if (selFilter) {
      selFilter.state = true;
      $scope.filterInputs.forEach((f) => {
        if (f !== selFilter) {
          f.state = false;
        }
      });
    } else {
      $scope.filterInputs.forEach((f) => {
        f.state = false;
      });
    }

    $scope.recomputeListEntries();
    // scroll to the bottom while changing filters so users don't have to
    // fixes the first of the fit-and-finish issues from
    // https://github.com/e-mission/e-mission-docs/issues/662
    $ionicScrollDelegate.scrollBottom();
    ClientStats.addReading(ClientStats.getStatKeys().LABEL_TAB_SWITCH, {"source": prev, "dest": $scope.getActiveFilters()});
  }

  $scope.updateLoadedRange = (oldestTrip, latestTrip) => {
    if (oldestTrip && oldestTrip.start_ts <= $scope.infScrollControl.pipelineRange.start_ts) {
      Logger.log("Oldest trip in batch starts at "+ moment(oldestTrip.start_ts)
          +" pipeline starts at "+moment($scope.infScrollControl.pipelineRange.start_ts)
          +". Reached the start of pipeline, nothing earlier to load");
      $scope.infScrollControl.oldestLoadedTs = oldestTrip.start_ts;
      $scope.infScrollControl.reachedPipelineStart = true;
    }
    if (latestTrip && latestTrip.end_ts >= $scope.infScrollControl.pipelineRange.end_ts) {
      Logger.log("Latest trip in batch ends at "+ moment(latestTrip.end_ts)
          +" pipeline ends at "+moment($scope.infScrollControl.pipelineRange.end_ts)
          +". Reached the end of pipeline, nothing later to load");
      $scope.infScrollControl.reachedPipelineEnd = true;
      $scope.infScrollControl.latestLoadedTs = latestTrip.end_ts;
    }
  }

  $scope.updateTimeRange = (dir, oldestTrip, latestTrip) => {
    $scope.updateLoadedRange(oldestTrip, latestTrip);
    if (!dir || dir == 'past') {
      if (oldestTrip) {
          if (oldestTrip.start_ts > $scope.infScrollControl.pipelineRange.start_ts) {
              // Since this was reversed, the first entry is the most recent
              $scope.infScrollControl.oldestLoadedTs =
                  oldestTrip.end_ts - 1;
              Logger.log("new oldest loaded time = "+$scope.infScrollControl.oldestLoadedTs);
          }
      } else {
          Logger.log("current batch of size 0 but haven't reached pipeline start, going on");
          $scope.infScrollControl.oldestLoadedTs = $scope.infScrollControl.oldestLoadedTs - ONE_WEEK;
      }
    }
    if (!dir || dir == 'future') {
      if (latestTrip) {
        if (latestTrip.end_ts < $scope.infScrollControl.pipelineRange.end_ts) {
            $scope.infScrollControl.latestLoadedTs =
                latestTrip.end_ts + 1;
            Logger.log("new latest loaded time = "+$scope.infScrollControl.latestLoadedTs);
        }
      } else {
          Logger.log("current batch of size 0 but haven't reached pipeline end, going on");
          $scope.infScrollControl.latestLoadedTs = $scope.infScrollControl.latestLoadedTs + ONE_WEEK;
      }
    }
    $scope.infScrollControl.selRangeText = moment($scope.infScrollControl.oldestLoadedTs*1000).format("L")
                                        + "\n" + moment($scope.infScrollControl.latestLoadedTs*1000).format("L");
    const rangeMiddle = ($scope.infScrollControl.oldestLoadedTs + $scope.infScrollControl.latestLoadedTs)/2;
    $scope.infScrollControl.selectedDay = moment(rangeMiddle*1000).toDate();
  }

  $scope.recomputeListEntries = function() {
    console.log("recomputing display timeline now");
    let alreadyFiltered = false;
    $scope.filterInputs?.forEach((f) => {
        if (f.state == true) {
            if (alreadyFiltered) {
                Logger.displayError("multiple filters not supported!", undefined);
            } else {
                // console.log("Trip n before: "+$scope.data.listEntries.length);
                $scope.data.displayTrips = $scope.data.allTrips.filter(
                    t => (t.waitingForMod == true) || f.filter(t));
                // console.log("Trip n after:  "+$scope.data.listEntries.length);
                alreadyFiltered = true;
            }
        }
    });
    if (!alreadyFiltered) {
        $scope.data.displayTrips = $scope.data.allTrips;
    };
    $scope.data.displayTrips.count = $scope.data.displayTrips.length;
    $scope.data.listEntries = ['header'];
    $scope.data.displayTrips.forEach((cTrip) => {
      const start_place = cTrip.start_confirmed_place;
      const end_place = cTrip.end_confirmed_place;

      // Add start place to the list, if not already present
      let isInList = $scope.data.listEntries.find(e => e._id?.$oid == start_place?._id.$oid);
      if ($scope.showPlaces && start_place && !isInList) {
        // Only display places with duration >= 60 seconds, or with no duration (i.e. currently ongoing)
        if (isNaN(start_place.duration) || start_place.duration >= 60) {
          $scope.data.listEntries.push(start_place);
        }

       // TODO: Remove me in June 2023
        // if (!start_place.display_start_time) {
          // If a start place does not have a display_start_time, it is the first place
          // We will set display_start_time to the beginning of the day
          // start_place.display_start_time = moment(start_place.exit_fmt_time).parseZone().startOf('day').format("h:mm A");
        // }
      }

      /* don't display untracked time if the trips that came before and
          after it are not displayed */
      if (cTrip.key.includes('untracked')) {
        const prevTrip = $scope.data.allTrips[$scope.data.allTrips.indexOf(cTrip) - 1];
        const nextTrip = $scope.data.allTrips[$scope.data.allTrips.indexOf(cTrip) + 1];
        const prevTripDisplayed = $scope.data.displayTrips.includes(prevTrip);
        const nextTripDisplayed = $scope.data.displayTrips.includes(nextTrip);
        if (prevTrip && !prevTripDisplayed || nextTrip && !nextTripDisplayed) {
          $scope.data.displayTrips.count -= 1;
          return;
        }
      }

      // Add trip to the list
      $scope.data.listEntries.push(cTrip);

      // Add end place to the list
      if ($scope.showPlaces && end_place) {
        // Only display places with duration >= 60 seconds, or with no duration (i.e. currently ongoing)
        if (isNaN(end_place.duration) || end_place.duration >= 60) {
            $scope.data.listEntries.push(end_place);
        }

        // TODO: Remove me in July 2023
        // if (!end_place.display_end_time) {
          // If an end place does not have a display_end_time, it is the last place
          // We will set display_end_time to the end of the day
          // end_place.display_end_time = moment(end_place.enter_fmt_time).parseZone().endOf('day').format("h:mm A");
        // }
      }
    });
    $scope.data.listEntries.push('footer');
    invalidateMaps();
  }

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

    $scope.populateBasicClasses = function(tripgj) {
        const beginTs = tripgj.start_ts || tripgj.enter_ts;
        const endTs = tripgj.end_ts || tripgj.exit_ts;
        const beginDt = tripgj.start_local_dt || tripgj.enter_local_dt;
        const endDt = tripgj.end_local_dt || tripgj.exit_local_dt;
        const isMultiDay = DiaryHelper.isMultiDay(beginTs, endTs);
        tripgj.display_date = DiaryHelper.getFormattedDate(beginTs, endTs, isMultiDay);
        tripgj.display_start_time = DiaryHelper.getLocalTimeString(beginDt);
        tripgj.display_end_time = DiaryHelper.getLocalTimeString(endDt);
        if (isMultiDay) {
          tripgj.display_start_date_abbr = DiaryHelper.getFormattedDateAbbr(beginTs);
          tripgj.display_end_date_abbr = DiaryHelper.getFormattedDateAbbr(endTs);
        }
        tripgj.display_duration = DiaryHelper.getFormattedDuration(beginTs, endTs);
        tripgj.display_time = DiaryHelper.getFormattedTimeRange(beginTs, endTs);
        if (tripgj.distance) {
          tripgj.display_distance = ImperialConfig.getFormattedDistance(tripgj.distance);
          tripgj.display_distance_suffix = ImperialConfig.getDistanceSuffix;
        }
        tripgj.background = "bg-light";
        tripgj.percentages = DiaryHelper.getPercentages(tripgj);
        tripgj.listCardClass = $scope.listCardClass(tripgj);
        // Pre-populate start and end names with &nbsp; so they take up the same amount of vertical space in the UI before they are populated with real data
        tripgj.start_display_name = "\xa0";
        tripgj.end_display_name = "\xa0";
    }

    const fillPlacesForTripAsync = function(tripgj) {
        const fillPromises = [
            placeLimiter.schedule(() =>
                DiaryHelper.getNominatimLocName(tripgj.start_loc)),
            placeLimiter.schedule(() =>
                DiaryHelper.getNominatimLocName(tripgj.end_loc)),
        ];
        Promise.all(fillPromises).then(function([startName, endName]) {
            $scope.$apply(() => {
                if (tripgj.start_confirmed_place) {
                  tripgj.start_confirmed_place.display_name = startName;
                }
                tripgj.start_display_name = startName;
                tripgj.end_display_name = endName;
                if (tripgj.end_confirmed_place) {
                  tripgj.end_confirmed_place.display_name = endName;
                }
            });
        });
    }

    const fillTrajectoriesForTrip = function (trip) {
      const tripgj = Timeline.compositeTrip2Geojson(trip);

      $scope.$apply(() => {
        trip.geojson = tripgj;
      });
    }

    $scope.refresh = function() {
       $scope.setupInfScroll();
    };

    $scope.$on('$ionicView.enter', function(ev) {
      $scope.startTime = moment().utc()
    });

    $scope.$on('$ionicView.leave',function() {
      var timeOnPage = moment().utc() - $scope.startTime;
      ClientStats.addReading(ClientStats.getStatKeys().INF_SCROLL_TIME, timeOnPage);
    });

    $ionicPlatform.on("pause", function() {
      if ($state.$current == "root.main.diary.list") {
        var timeOnPage = moment().utc() - $scope.startTime;
        ClientStats.addReading(ClientStats.getStatKeys().INF_SCROLL_TIME, timeOnPage);
      }
    })

    $ionicPlatform.on("resume", function() {
      if ($state.$current == "root.main.diary.list") {
        $scope.startTime = moment().utc()
      }
      $scope.checkPermissionsStatus();
    })

    $ionicPlatform.ready().then(function() {
      DynamicConfig.configReady().then((configObj) => {
        // Logger.log("Resolved UI_CONFIG_READY promise in infinite_scroll_list.js, filling in templates");
        $scope.init(configObj);
      });
      $scope.isAndroid = $window.device.platform.toLowerCase() === "android";

      $scope.$on('$ionicView.afterEnter', function() {
        ClientStats.addEvent(ClientStats.getStatKeys().CHECKED_INF_SCROLL).then(function() {
           console.log("Added "+ClientStats.getStatKeys().CHECKED_INF_SCROLL+" event");
        });
        $scope.$apply(() => {
            if ($scope.data && $scope.data.allTrips) {
                $scope.data.allTrips.forEach(function(tripgj, tripIndex, array) {
                    let tripFromDiary = Timeline.getTripWrapper(tripgj.id);
                    // Since the label screen has trips from multiple days, we
                    // may not always find a matching trip in the diary
                    if (tripFromDiary) {
                        $scope.labelPopulateFactory.copyInputIfNewer(tripFromDiary, tripgj);
                    }
                });
                $scope.recomputeListEntries();
            } else {
                console.log("No trips loaded yet, no inputs to copy over");
            }
        });
        if($rootScope.barDetail){
          readAndUpdateForDay($rootScope.barDetailDate);
          $rootScope.barDetail = false;
        }
      });
    });
});
