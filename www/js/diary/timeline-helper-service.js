'use strict';

angular.module('emission.main.diary.timeline-helper.service', [
  'emission.plugin.logger',
  'emission.services', 'emission.main.common.services',
  'emission.enketo-survey.service',
  'emission.incident.posttrip.manual',
])
.factory('Timeline', function (
  CommHelper, $http, $ionicLoading, $window,
  $rootScope, CommonGraph, UnifiedDataLoader, EnketoSurvey, Logger
) {
  var timeline = {};
  // corresponds to the old $scope.data. Contains all state for the current
  // day, including the indication of the current day
  timeline.data = {};
  timeline.data.unifiedConfirmsResults = null;
  timeline.UPDATE_DONE = "TIMELINE_UPDATE_DONE";

  // Internal function, not publicly exposed
  var getKeyForDate = function (date) {
    var dateString = date.startOf('day').format('YYYY-MM-DD');
    return "diary/trips-" + dateString;
  };

  timeline.updateFromDatabase = function (day) {
    console.log("About to show 'Reading from cache'");
    $ionicLoading.show({
      template: 'Reading from cache...'
    });
    return window.cordova.plugins.BEMUserCache.getDocument(getKeyForDate(day), false)
      .then(function (timelineDoc) {
        if (!window.cordova.plugins.BEMUserCache.isEmptyDoc(timelineDoc)) {
          var tripList = timelineDoc;
          console.log("About to hide 'Reading from cache'");
          $ionicLoading.hide();
          return tripList;
        } else {
          console.log("while reading data for " + day + " from database, no records found");
          console.log("About to hide 'Reading from cache'");
          $ionicLoading.hide();
          return [];
        }
      });
  };

  timeline.updateFromServer = function (day) {
    console.log("About to show 'Reading from server'");
    $ionicLoading.show({
      template: 'Reading from server...'
    });
    return CommHelper.getTimelineForDay(day).then(function (response) {
      var tripList = response.timeline;
      window.Logger.log(window.Logger.LEVEL_DEBUG,
        "while reading data for " + day + " from server, got nTrips = " + tripList.length);
      console.log("About to hide 'Reading from server'");
      $ionicLoading.hide();
      console.log("Finished hiding ionicLoading, returning list of size " + tripList.length);
      return tripList;
    });
  };

  /*
    * Used for quick debugging using the live updating server. But then I
    * can't use plugins, so we read from the local file system instead. Should
    * be replaced by a mock of the usercache instead, but this is code
    * movement, not restructuring, so it should stay here.
    */
  var readAndUpdateFromFile = function (day, foundFn, notFoundFn) {
    console.log("About to show 'Reading from local file'");
    $ionicLoading.show({
      template: 'Debugging: Reading from local file...'
    });
    return $http.get("test_data/" + getKeyForDate(day)).then(function (response) {
      console.log("while reading data for " + day + " from file, status = " + response.status);
      tripList = response.data;
      return tripList;
    });
  };

  timeline.isProcessingComplete = function (day) {
    return CommHelper.getPipelineCompleteTs().then(function (result) {
      var eod = moment(day).endOf("day").unix();
      var retVal = (result.complete_ts > eod);
      Logger.log("complete_ts = "
        + result.complete_ts + "(" + moment.unix(result.complete_ts).toString() + ")"
        + " end of current day = "
        + eod + "(" + moment.unix(eod).toString() + ")"
        + " retVal = " + retVal);
      return retVal;
    });
  };

  /*
    * This is going to be a bit tricky. As we can see from
    * https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-286279163,
    * when we read local transitions, they have a string for the transition
    * (e.g. `T_DATA_PUSHED`), while the remote transitions have an integer
    * (e.g. `2`).
    * See https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-286338606
    * 
    * Also, at least on iOS, it is possible for trip end to be detected way
    * after the end of the trip, so the trip end transition of a processed
    * trip may actually show up as an unprocessed transition.
    * See https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-286279163
    * 
    * Let's abstract this out into our own minor state machine.
    */
  var transition2Trip = function (transitionList) {
    var inTrip = false;
    var tripList = []
    var currStartTransitionIndex = -1;
    var currEndTransitionIndex = -1;
    var processedUntil = 0;

    while (processedUntil < transitionList.length) {
      // Logger.log("searching within list = "+JSON.stringify(transitionList.slice(processedUntil)));
      if (inTrip == false) {
        var foundStartTransitionIndex = transitionList.slice(processedUntil).findIndex(isStartingTransition);
        if (foundStartTransitionIndex == -1) {
          Logger.log("No further unprocessed trips started, exiting loop");
          processedUntil = transitionList.length;
        } else {
          currStartTransitionIndex = processedUntil + foundStartTransitionIndex;
          processedUntil = currStartTransitionIndex;
          Logger.log("Unprocessed trip started at " + JSON.stringify(transitionList[currStartTransitionIndex]));
          inTrip = true;
        }
      } else {
        // Logger.log("searching within list = "+JSON.stringify(transitionList.slice(processedUntil)));
        var foundEndTransitionIndex = transitionList.slice(processedUntil).findIndex(isEndingTransition);
        if (foundEndTransitionIndex == -1) {
          Logger.log("Can't find end for trip starting at " + JSON.stringify(transitionList[currStartTransitionIndex]) + " dropping it");
          processedUntil = transitionList.length;
        } else {
          currEndTransitionIndex = processedUntil + foundEndTransitionIndex;
          processedUntil = currEndTransitionIndex;
          Logger.log("currEndTransitionIndex = " + currEndTransitionIndex);
          Logger.log("Unprocessed trip starting at " + JSON.stringify(transitionList[currStartTransitionIndex]) + " ends at " + JSON.stringify(transitionList[currEndTransitionIndex]));
          tripList.push([transitionList[currStartTransitionIndex],
          transitionList[currEndTransitionIndex]])
          inTrip = false;
        }
      }
    }
    return tripList;
  };

  var isStartingTransition = function (transWrapper) {
    // Logger.log("isStartingTransition: transWrapper.data.transition = "+transWrapper.data.transition);
    if (transWrapper.data.transition == 'local.transition.exited_geofence' ||
      transWrapper.data.transition == 'T_EXITED_GEOFENCE' ||
      transWrapper.data.transition == 1) {
      // Logger.log("Returning true");
      return true;
    }
    // Logger.log("Returning false");
    return false;
  };

  var isEndingTransition = function (transWrapper) {
    // Logger.log("isEndingTransition: transWrapper.data.transition = "+transWrapper.data.transition);
    if (transWrapper.data.transition == 'T_TRIP_ENDED' ||
      transWrapper.data.transition == 'local.transition.stopped_moving' ||
      transWrapper.data.transition == 2) {
      // Logger.log("Returning true");
      return true;
    }
    // Logger.log("Returning false");
    return false;
  };

  /*
    * Fill out place geojson after pulling trip location points.
    * Place is only partially filled out because we haven't linked the timeline yet
    */
  var moment2localdate = function (currMoment, tz) {
    return {
      timezone: tz,
      year: currMoment.year(),
      month: currMoment.month(),
      day: currMoment.day(),
      weekday: currMoment.weekday(),
      hour: currMoment.hour(),
      minute: currMoment.minute(),
      second: currMoment.second()
    };
  };

  var startPlacePropertyFiller = function (locationPoint) {
    var locationMoment = moment.unix(locationPoint.data.ts).tz(locationPoint.metadata.time_zone);
    // properties that need to be filled in while stitching together
    // duration, ending_trip, enter_*
    return {
      "exit_fmt_time": locationMoment.format(),
      "exit_local_dt": moment2localdate(locationMoment, locationPoint.metadata.time_zone),
      "exit_ts": locationPoint.data.ts,
      "feature_type": "start_place",
      "raw_places": [],
      "source": "unprocessed"
    }
  };

  var endPlacePropertyFiller = function (locationPoint) {
    var locationMoment = moment.unix(locationPoint.data.ts).tz(locationPoint.metadata.time_zone);
    // properties that need to be filled in while stitching together
    // duration, starting_trip, exit_*
    return {
      "enter_fmt_time": locationMoment.format(),
      "enter_local_dt": moment2localdate(locationMoment, locationPoint.metadata.time_zone),
      "enter_ts": locationPoint.data.ts,
      "feature_type": "end_place",
      "raw_places": [],
      "source": "unprocessed"
    }
  };

  var place2Geojson = function (trip, locationPoint, propertyFiller) {
    var place_gj = {
      "id": "unprocessed_" + locationPoint.data.ts,
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [locationPoint.data.longitude, locationPoint.data.latitude]
      },
      "properties": propertyFiller(locationPoint)
    }
    return place_gj;
  };

  var points2Geojson = function (trip, locationPoints) {
    var startPoint = locationPoints[0];
    var endPoint = locationPoints[locationPoints.length - 1];
    var tripAndSectionId = "unprocessed_" + startPoint.data.ts + "_" + endPoint.data.ts;
    var startMoment = moment.unix(startPoint.data.ts).tz(startPoint.metadata.time_zone);
    var endMoment = moment.unix(endPoint.data.ts).tz(endPoint.metadata.time_zone);

    var sectionCoordinates = locationPoints.map(function (point) {
      return [point.data.longitude, point.data.latitude];
    });

    var leafletLatLng = sectionCoordinates.map(function (currCoords) {
      return L.GeoJSON.coordsToLatLng(currCoords);
    });

    var distances = [0];
    for (var i = 0; i < leafletLatLng.length - 1; i++) {
      distances.push(leafletLatLng[i].distanceTo(leafletLatLng[i + 1]));
    }

    var times = locationPoints.map(function (point) {
      return point.data.ts;
    });

    var timeDeltas = [0];
    for (var i = 0; i < times.length - 1; i++) {
      timeDeltas.push(times[i + 1] - times[i]);
    }

    var speeds = [0];
    if (distances.length != timeDeltas.length) {
      throw "distances.length " + distances.length + " != timeDeltas.length " + timeDeltas.length;
    }
    for (var i = 1; i < times.length; i++) {
      speeds.push(distances[i] / timeDeltas[i]);
    }

    var section_gj = {
      "id": tripAndSectionId,
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": sectionCoordinates
      },
      // missing properties are:
      "properties": {
        distances: distances,
        distance: distances.reduce(function (acc, val) {
          return acc + val;
        }, 0),
        duration: endPoint.data.ts - startPoint.data.ts,
        end_fmt_time: endMoment.format(),
        end_local_dt: moment2localdate(endMoment),
        end_ts: endPoint.data.ts,
        feature_type: "section",
        sensed_mode: "MotionTypes.UNPROCESSED",
        source: "unprocessed",
        speeds: speeds,
        start_fmt_time: startMoment.format(),
        start_local_dt: moment2localdate(startMoment),
        start_ts: startPoint.data.ts,
        times: times,
        trip_id: { $oid: tripAndSectionId }
      }
    }
    return {
      type: "FeatureCollection",
      features: [section_gj]
    }
  };

  var tsEntrySort = function (e1, e2) {
    // compare timestamps
    return e1.data.ts - e2.data.ts;
  };

  var trip2Geojson = function (trip) {
    var tripStartTransition = trip[0];
    var tripEndTransition = trip[1];
    var tq = {
      key: "write_ts",
      startTs: tripStartTransition.data.ts,
      endTs: tripEndTransition.data.ts
    }
    Logger.log("About to pull location data for range "
      + moment.unix(tripStartTransition.data.ts).toString() + " -> "
      + moment.unix(tripEndTransition.data.ts).toString());
    return UnifiedDataLoader.getUnifiedSensorDataForInterval("background/filtered_location", tq).then(function (locationList) {
      if (locationList.length == 0) {
        return undefined;
      }
      var sortedLocationList = locationList.sort(tsEntrySort);
      var retainInRange = function (loc) {
        return (tripStartTransition.data.ts <= loc.data.ts) &&
          (loc.data.ts <= tripEndTransition.data.ts)
      }

      var filteredLocationList = sortedLocationList.filter(retainInRange);

      var tripStartPoint = filteredLocationList[0];
      var tripEndPoint = filteredLocationList[filteredLocationList.length - 1];
      Logger.log("tripStartPoint = " + JSON.stringify(tripStartPoint) + "tripEndPoint = " + JSON.stringify(tripEndPoint));
      var features = [
        place2Geojson(trip, tripStartPoint, startPlacePropertyFiller),
        place2Geojson(trip, tripEndPoint, endPlacePropertyFiller),
        points2Geojson(trip, filteredLocationList)
      ];
      var section_gj = features[2];
      var trip_gj = {
        id: section_gj.features[0].id,
        type: "FeatureCollection",
        features: features,
        properties: angular.copy(section_gj.features[0].properties)
      }

      Logger.log("section_gj.properties = " + JSON.stringify(section_gj.features[0].properties) +
        " trip_gj.properties = " + JSON.stringify(trip_gj.properties));
      // customize to trip versus section properties
      trip_gj.properties.feature_type = "trip";
      trip_gj.properties.start_loc = features[0].geometry;
      trip_gj.properties.start_place = { $oid: features[0].id }
      trip_gj.properties.end_loc = features[1].geometry;
      trip_gj.properties.end_place = { $oid: features[1].id }
      trip_gj.properties.raw_trip = [];

      // delete the detailed lists which are only at the section level
      delete (trip_gj.properties.distances);
      delete (trip_gj.properties.speeds);
      delete (trip_gj.properties.times);
      return trip_gj;
    });
  };

  var linkTrips = function (trip_gj1, trip_gj2) {
    var trip_1_end = trip_gj1.features[1];
    var trip_2_start = trip_gj2.features[0];

    // complete trip_1
    trip_1_end.properties.starting_trip = { $oid: trip_gj2.properties.id };
    trip_1_end.properties.exit_fmt_time = trip_2_start.properties.enter_fmt_time;
    trip_1_end.properties.exit_local_dt = trip_2_start.properties.enter_local_dt;
    trip_1_end.properties.exit_ts = trip_2_start.properties.enter_ts;

    // start trip_2
    trip_2_start.properties.ending_trip = { $oid: trip_gj1.properties.id };
    trip_2_start.properties.enter_fmt_time = trip_1_end.properties.exit_fmt_time;
    trip_2_start.properties.enter_local_dt = trip_1_end.properties.exit_local_dt;
    trip_2_start.properties.enter_ts = trip_1_end.properties.exit_ts;
  };

  timeline.readUnprocessedTrips = function (day, tripListForDay) {
    /*
      * We want to read all unprocessed transitions, which are all transitions
      * from the last processed trip until the end of the day. But now we
      * need to figure out which timezone we need to use for the end of the
      * day.
      * 
      * I think that it should be fine to use the current timezone.
      * 
      * Details: https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-284284382
      * One problem with simply querying for transactions after this is
      * that sometimes we skip trips in the cleaning phase because they are
      * spurious. So if we have already processed this day but had a
      * spurious trip after the last real trip, it would show up again.
      * 
      * We deal with this by ensuring that this is called iff we are beyond
      * the end of the processed data.
      *
      * Logic for start_ts described at
      * https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-284312004
      */
    $ionicLoading.show({
      template: 'Reading unprocessed data...'
    });
    if (tripListForDay.length == 0) {
      var last_processed_ts = moment(day).startOf("day").unix();
    } else {
      var last_processed_ts = tripListForDay[tripListForDay.length - 1].properties.end_ts;
    }
    Logger.log("found " + tripListForDay.length + " trips, last_processed_ts = " + moment.unix(last_processed_ts).toString());

    var tq = {
      key: "write_ts",
      startTs: last_processed_ts,
      endTs: moment(day).endOf("day").unix()
    }
    Logger.log("about to query for unprocessed trips from "
      + moment.unix(tq.startTs).toString() + " -> " + moment.unix(tq.endTs).toString());
    return UnifiedDataLoader.getUnifiedMessagesForInterval("statemachine/transition", tq)
      .then(function (transitionList) {
        if (transitionList.length == 0) {
          Logger.log("No unprocessed trips. yay!");
          $ionicLoading.hide();
          return [];
        } else {
          Logger.log("Found " + transitionList.length + " transitions. yay!");
          var sortedTransitionList = transitionList.sort(tsEntrySort);
          /*
          sortedTransitionList.forEach(function(transition) {
              console.log(JSON.stringify(transition));
          });
          */
          var tripsList = transition2Trip(transitionList);
          Logger.log("Mapped into" + tripsList.length + " trips. yay!");
          tripsList.forEach(function (trip) {
            console.log(JSON.stringify(trip));
          });
          var tripFillPromises = tripsList.map(trip2Geojson);
          return Promise.all(tripFillPromises).then(function (raw_trip_gj_list) {
            // Now we need to link up the trips. linking unprocessed trips
            // to one another is fairly simple, but we need to link the
            // first unprocessed trip to the last processed trip.
            // This might be challenging if we don't have any processed
            // trips for the day. I don't want to go back forever until 
            // I find a trip. So if this is the first trip, we will start a
            // new chain for now, since this is with unprocessed data
            // anyway.

            Logger.log("mapped trips to trip_gj_list of size " + raw_trip_gj_list.length);
            var trip_gj_list = raw_trip_gj_list.filter(angular.isDefined);
            Logger.log("after filtering undefined, trip_gj_list size = " + raw_trip_gj_list.length);
            // Link 0th trip to first, first to second, ...
            for (var i = 0; i < trip_gj_list.length - 1; i++) {
              linkTrips(trip_gj_list[i], trip_gj_list[i + 1]);
            }
            Logger.log("finished linking trips for list of size " + trip_gj_list.length);
            if (tripListForDay.length != 0 && trip_gj_list.length != 0) {
              // Need to link the entire chain above to the processed data
              Logger.log("linking unprocessed and processed trip chains");
              var last_processed_trip = tripListForDay[tripListForDay.length - 1]
              linkTrips(last_processed_trip, trip_gj_list[0]);
            }
            $ionicLoading.hide();
            Logger.log("Returning final list of size " + trip_gj_list.length);
            return trip_gj_list;
          });
        }
      });
  };

  var processOrDisplayNone = function (day, tripList) {
    if (angular.isDefined(tripList) && tripList.length != 0) {
      console.log("trip count = " + tripList.length + ", calling processTripsForDay");
      processTripsForDay(day, tripList);
    } else {
      console.log("No trips found, alerting user");
      timeline.data.currDay = day;
      timeline.data.currDayTrips = []
      timeline.data.currDaySummary = {}
      $rootScope.$emit(timeline.UPDATE_DONE, { 'from': 'emit', 'status': 'error' });
      $rootScope.$broadcast(timeline.UPDATE_DONE, { 'from': 'broadcast', 'status': 'error' });
    }
  };

  var localCacheReadFn = timeline.updateFromDatabase;

  // Functions
  timeline.updateForDay = function (day) { // currDay is a moment
    // First, we try the server
    var tripsFromServerPromise = timeline.updateFromServer(day);
    var isProcessingCompletePromise = timeline.isProcessingComplete(day);

    // Deal with all the trip retrieval
    Promise.all([tripsFromServerPromise, isProcessingCompletePromise])
      .then(function ([processedTripList, completeStatus]) {
        console.log("Promise.all() finished successfully with length "
          + processedTripList.length + " completeStatus = " + completeStatus);
        var tripList = processedTripList;
        if (!completeStatus) {
          return timeline.readUnprocessedTrips(day, processedTripList)
            .then(function (unprocessedTripList) {
              Logger.log("tripList.length = " + tripList.length
                + "unprocessedTripList.length = " + unprocessedTripList.length);
              Array.prototype.push.apply(tripList, unprocessedTripList);
              console.log("After merge, returning trip list of size " + tripList.length);
              return tripList;
            });
        } else {
          return tripList;
        }
      }).then(function (combinedTripList) {
        var tq = { key: 'write_ts', startTs: 0, endTs: moment().endOf('day').unix(), };
        return Promise.all([
          UnifiedDataLoader.getUnifiedMessagesForInterval('manual/mode_confirm', tq),
          UnifiedDataLoader.getUnifiedMessagesForInterval('manual/purpose_confirm', tq),
          EnketoSurvey.getAllSurveyAnswers('manual/confirm_survey', { populateLabels: true }),
        ]).then(function (results) {
          timeline.data.unifiedConfirmsResults = {
            modes: results[0],
            purposes: results[1],
            surveyAnswers: results[2]
          };
          return combinedTripList;
        });
        return combinedTripList;
      }).then(function (combinedTripList) {
        processOrDisplayNone(day, combinedTripList);
      }).catch(function (error) {
        // If there is any error reading from the server, we fallback on the local cache
        Logger.log("while reading data from server for " + day + " error = " + JSON.stringify(error));
        console.log("About to hide loading overlay");
        $ionicLoading.hide();
        localCacheReadFn(day).then(function (processedTripList) {
          var tripList = processedTripList;
          return timeline.readUnprocessedTrips(day, processedTripList)
            .then(function (unprocessedTripList) {
              Logger.log("tripList.length = " + tripList.length
                + "unprocessedTripList.length = " + unprocessedTripList.length);
              Array.prototype.push.apply(tripList, unprocessedTripList);
              console.log("After merge, returning trip list of size " + tripList.length);
              return tripList;
            })
        }).then(function (combinedTripList) {
          processOrDisplayNone(day, combinedTripList);
        }).catch(function (error) {
          console.log("About to hide loading overlay");
          $ionicLoading.hide();
          Logger.displayError("while reading data from cache for " + day, error);
        })
      });
  };

  timeline.getTrip = function (tripId) {
    return timeline.data.tripMap[tripId];
  };

  timeline.getTripWrapper = function (tripId) {
    return timeline.data.tripWrapperMap[tripId];
  };

  /*
    Let us assume that we have recieved a list of trips for that date from somewhere
    (either local usercache or the internet). Now, what do we need to process them?
    */
  var processTripsForDay = function (day, tripListForDay) {
    console.log("About to show 'Processing trips'");
    $ionicLoading.show({
      template: 'Processing trips...'
    });
    tripListForDay.forEach(function (item, index, array) {
      console.log(index + ":" + item.properties.start_fmt_time + ", " + item.properties.duration);

    });
    timeline.data.currDay = day;
    timeline.data.currDayTrips = tripListForDay;

    timeline.data.tripMap = {};

    timeline.data.currDayTrips.forEach(function (trip, index, array) {
      timeline.data.tripMap[trip.id] = trip;
    });

    timeline.data.currDayTrips.forEach(function (trip, index, array) {
      var tc = getTripComponents(trip);
      trip.start_place = tc[0];
      trip.end_place = tc[1];
      trip.stops = tc[2];
      trip.sections = tc[3];
    });

    timeline.data.currDayTrips.forEach(function (trip, index, array) {
      if (angular.isDefined(trip.start_place.properties.display_name)) {
        if (trip.start_place.properties.display_name != ", ") {
          console.log("Already have display name " + trip.start_place.properties.display_name + " for start_place")
        } else {
          console.log("Got display name " + trip.start_place.properties.display_name + " for start_place, but it is blank, trying OSM nominatim now...");
          CommonGraph.getDisplayName('place', trip.start_place);
        }
      } else {
        console.log("Don't have display name for start place, going to query nominatim")
        CommonGraph.getDisplayName('place', trip.start_place);

      }
      if (angular.isDefined(trip.end_place.properties.display_name)) {
        if (trip.end_place.properties.display_name != ", ") {
          console.log("Already have display name " + trip.end_place.properties.display_name + " for end_place")
        } else {
          console.log("Got display name " + trip.end_place.properties.display_name + " for end_place, but it is blank, trying OSM nominatim now...");
          CommonGraph.getDisplayName('place', trip.end_place);
        }
      } else {
        console.log("Don't have display name for end place, going to query nominatim")
        CommonGraph.getDisplayName('place', trip.end_place);
      }
    });

    generateDaySummary();

    if (tripListForDay.length == 0) {
      handleZeroTrips();
    }

    console.log("currIndex = " + timeline.data.currDay + " currDayTrips = " + timeline.data.currDayTrips.length);

    // Return to the top of the page. If we don't do this, then we will be stuck at the
    $rootScope.$emit(timeline.UPDATE_DONE, { 'from': 'emit', 'status': 'success' });
    $rootScope.$broadcast(timeline.UPDATE_DONE, { 'from': 'broadcast', 'status': 'success' });
    console.log("About to hide 'Processing trips'");
    $ionicLoading.hide();
  };

  timeline.setTripWrappers = function (tripWrapperList) {
    timeline.data.currDayTripWrappers = tripWrapperList;

    timeline.data.tripWrapperMap = {};

    timeline.data.currDayTripWrappers.forEach(function (tripw, index, array) {
      timeline.data.tripWrapperMap[tripw.data.id] = tripw;
    });
  };

  // TODO: Should this be in the factory or in the scope?
  var generateDaySummary = function () {
    var dayMovingTime = 0;
    var dayStoppedTime = 0;
    var dayDistance = 0;

    timeline.data.currDayTrips.forEach(function (trip, index, array) {
      trip.tripSummary = {}
      var movingTime = 0
      var stoppedTime = 0
      trip.stops.forEach(function (stop, index, array) {
        stoppedTime = stoppedTime + stop.properties.duration;
      });
      trip.sections.forEach(function (section, index, array) {
        movingTime = movingTime + section.properties.duration;
      });
      trip.tripSummary.movingTime = movingTime;
      trip.tripSummary.stoppedTime = stoppedTime;
      trip.tripSummary.movingPct = (movingTime / (movingTime + stoppedTime)) * 100;
      trip.tripSummary.stoppedPct = (stoppedTime / (movingTime + stoppedTime)) * 100;
      dayMovingTime = dayMovingTime + trip.tripSummary.movingTime;
      dayStoppedTime = dayStoppedTime + trip.tripSummary.stoppedTime;
      console.log("distance = " + trip.properties.distance);
      dayDistance = dayDistance + trip.properties.distance;
    });

    var dayInSecs = 24 * 60 * 60;

    timeline.data.currDaySummary = {
      breakdown: [
        ["moving", dayMovingTime],
        ["waiting", dayStoppedTime],
        ["in place", dayInSecs - (dayMovingTime + dayStoppedTime)],
      ]
    }
    timeline.data.currDaySummary.distance = dayDistance;
  };

  var handleZeroTrips = function () {
    // showNoTripsAlert();
    var dayInSecs = 24 * 60 * 60;
    timeline.data.currDayTrips = []
    timeline.data.currDaySummary = {}
    timeline.data.currDaySummary = {
      breakdown: [
        ["moving", 0],
        ["waiting", 0],
        ["in place", dayInSecs],
      ]
    }
    timeline.data.currDaySummary.distance = 0;
  };

  var getTripComponents = function (trip) {
    console.log("getSections(" + trip + ") called");
    var startPlace = null;
    var endPlace = null;
    var stopList = [];
    var sectionList = [];
    trip.features.forEach(function (feature, index, array) {
      // console.log("Considering feature " + JSON.stringify(feature));
      switch (feature.type) {
        case "Feature":
          switch (feature.properties.feature_type) {
            case "start_place":
              startPlace = feature;
              break;
            case "end_place":
              endPlace = feature;
              break;
            case "stop":
              stopList.push(feature);
              break;
          }
          break;
        case "FeatureCollection":
          feature.features.forEach(function (item, index, array) {
            if (angular.isDefined(item.properties) && angular.isDefined(item.properties.feature_type)) {
              // console.log("Considering feature with type " + item.properties.feature_type);
              if (item.properties.feature_type == "section") {
                console.log("FOUND section" + item + ", appending");
                sectionList.push(item);
              }
            }
          });
      }
    });
    return [startPlace, endPlace, stopList, sectionList];
  };

  return timeline;
});
