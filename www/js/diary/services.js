'use strict';

import angular from 'angular';
import { getBaseModeByKey, getBaseModeOfLabeledTrip } from './diaryHelper';
import { SurveyOptions } from '../survey/survey';
import { getConfig } from '../config/dynamicConfig';

angular.module('emission.main.diary.services', ['emission.plugin.logger',
                                                'emission.services'])
.factory('Timeline', function(CommHelper, $http, $ionicLoading, $ionicPlatform, $window,
    $rootScope, UnifiedDataLoader, Logger, $injector) {
    var timeline = {};
    // corresponds to the old $scope.data. Contains all state for the current
    // day, including the indication of the current day
    timeline.data = {};
    timeline.data.unifiedConfirmsResults = null;
    timeline.UPDATE_DONE = "TIMELINE_UPDATE_DONE";

    let manualInputFactory;
    $ionicPlatform.ready(function () {
      getConfig().then((configObj) => {
        const surveyOptKey = configObj.survey_info['trip-labels'];
        const surveyOpt = SurveyOptions[surveyOptKey];
        console.log('surveyOpt in services.js is', surveyOpt);
        manualInputFactory = $injector.get(surveyOpt.service);
      });
    });

    // DB entries retrieved from the server have '_id', 'metadata', and 'data' fields.
    // This function returns a shallow copy of the obj, which flattens the
    // 'data' field into the top level, while also including '_id' and 'metadata.key'
    const unpack = (obj) => ({
      ...obj.data,
      _id: obj._id,
      key: obj.metadata.key,
      origin_key: obj.metadata.origin_key || obj.metadata.key,
    });

    timeline.readAllCompositeTrips = function(startTs, endTs) {
      $ionicLoading.show({
        template: i18next.t('service.reading-server')
      });
      const readPromises = [
        CommHelper.getRawEntries(["analysis/composite_trip"],
            startTs, endTs, "data.end_ts"),
      ];
      return Promise.all(readPromises)
        .then(([ctList]) => {
            $ionicLoading.hide();
            return ctList.phone_data.map((ct) => {
              const unpackedCt = unpack(ct);
              return {
                ...unpackedCt,
                start_confirmed_place: unpack(unpackedCt.start_confirmed_place),
                end_confirmed_place: unpack(unpackedCt.end_confirmed_place),
                locations: unpackedCt.locations?.map(unpack),
                sections: unpackedCt.sections?.map(unpack),
              }
            });
        })
        .catch((err) => {
            Logger.displayError("while reading confirmed trips", err);
            $ionicLoading.hide();
            return [];
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
    var transitions2Trips = function(transitionList) {
        var inTrip = false;
        var tripList = []
        var currStartTransitionIndex = -1;
        var currEndTransitionIndex = -1;
        var processedUntil = 0;
       
        while(processedUntil < transitionList.length) { 
          // Logger.log("searching within list = "+JSON.stringify(transitionList.slice(processedUntil)));
          if(inTrip == false) {
              var foundStartTransitionIndex = transitionList.slice(processedUntil).findIndex(isStartingTransition);
              if (foundStartTransitionIndex == -1) {
                  Logger.log("No further unprocessed trips started, exiting loop");
                  processedUntil = transitionList.length;
              } else {
                  currStartTransitionIndex = processedUntil + foundStartTransitionIndex;
                  processedUntil = currStartTransitionIndex;
                  Logger.log("Unprocessed trip started at "+JSON.stringify(transitionList[currStartTransitionIndex]));
                  inTrip = true;
              }
          } else {
              // Logger.log("searching within list = "+JSON.stringify(transitionList.slice(processedUntil)));
              var foundEndTransitionIndex = transitionList.slice(processedUntil).findIndex(isEndingTransition);
              if (foundEndTransitionIndex == -1) {
                  Logger.log("Can't find end for trip starting at "+JSON.stringify(transitionList[currStartTransitionIndex])+" dropping it");
                  processedUntil = transitionList.length;
              } else {
                  currEndTransitionIndex = processedUntil + foundEndTransitionIndex;
                  processedUntil = currEndTransitionIndex;
                  Logger.log("currEndTransitionIndex = "+currEndTransitionIndex);
                  Logger.log("Unprocessed trip starting at "+JSON.stringify(transitionList[currStartTransitionIndex])+" ends at "+JSON.stringify(transitionList[currEndTransitionIndex]));
                  tripList.push([transitionList[currStartTransitionIndex],
                                 transitionList[currEndTransitionIndex]])  
                  inTrip = false;
              }
          }
        }
        return tripList;
    }

    var isStartingTransition = function(transWrapper) {
        // Logger.log("isStartingTransition: transWrapper.data.transition = "+transWrapper.data.transition);
        if(transWrapper.data.transition == 'local.transition.exited_geofence' ||
            transWrapper.data.transition == 'T_EXITED_GEOFENCE' ||
            transWrapper.data.transition == 1) {
            // Logger.log("Returning true");
            return true;
        }
        // Logger.log("Returning false");
        return false;
    }

    var isEndingTransition = function(transWrapper) {
        // Logger.log("isEndingTransition: transWrapper.data.transition = "+transWrapper.data.transition);
        if(transWrapper.data.transition == 'T_TRIP_ENDED' ||
            transWrapper.data.transition == 'local.transition.stopped_moving' || 
            transWrapper.data.transition == 2) {
            // Logger.log("Returning true");
            return true;
        }
        // Logger.log("Returning false");
        return false;
    }

    /*
     * Fill out place geojson after pulling trip location points.
     * Place is only partially filled out because we haven't linked the timeline yet
     */

    var moment2localdate = function(currMoment, tz) {
        return {
            timezone: tz,
            year: currMoment.year(),
            //the months of the draft trips match the one format needed for
            //moment function however now that is modified we need to also
            //modify the months value here
            month: currMoment.month() + 1,
            day: currMoment.date(),
            weekday: currMoment.weekday(),
            hour: currMoment.hour(),
            minute: currMoment.minute(),
            second: currMoment.second()
        };
    }

    var points2TripProps = function(locationPoints) {
      var startPoint = locationPoints[0];
      var endPoint = locationPoints[locationPoints.length - 1];
      var tripAndSectionId = "unprocessed_"+startPoint.data.ts+"_"+endPoint.data.ts;
      var startMoment = moment.unix(startPoint.data.ts).tz(startPoint.metadata.time_zone);
      var endMoment = moment.unix(endPoint.data.ts).tz(endPoint.metadata.time_zone);

      const speeds = [], dists = [];
      let loc, locLatLng;
      locationPoints.forEach((pt) => {
        const ptLatLng = L.latLng([pt.data.latitude, pt.data.longitude]);
        if (loc) {
          const dist = locLatLng.distanceTo(ptLatLng);
          const timeDelta = pt.data.ts - loc.data.ts;
          dists.push(dist);
          speeds.push(dist / timeDelta);
        }
        loc = pt;
        locLatLng = ptLatLng;
      });
      
      const locations = locationPoints.map((point, i) => ({
          loc: {
            coordinates: [point.data.longitude, point.data.latitude]
          },
          ts: point.data.ts,
          speed: speeds[i],
      }));

      return {
        _id: {$oid: tripAndSectionId},
        key: "UNPROCESSED_trip",
        origin_key: "UNPROCESSED_trip",
        additions: [],
        confidence_threshold: 0,
        distance: dists.reduce((a, b) => a + b, 0),
        duration: endPoint.data.ts - startPoint.data.ts,
        end_fmt_time: endMoment.format(),
        end_local_dt: moment2localdate(endMoment, endPoint.metadata.time_zone),
        end_ts: endPoint.data.ts,
        expectation: {to_label: true},
        inferred_labels: [],
        locations: locations,
        source: "unprocessed",
        start_fmt_time: startMoment.format(),
        start_local_dt: moment2localdate(startMoment, startPoint.metadata.time_zone),
        start_ts: startPoint.data.ts,
        user_input: {},
      }
    }

    var tsEntrySort = function(e1, e2) {
      // compare timestamps
      return e1.data.ts - e2.data.ts;
    }

    var transitionTrip2TripObj = function(trip) {
      var tripStartTransition = trip[0];
      var tripEndTransition = trip[1];
      var tq = {key: "write_ts",
         startTs: tripStartTransition.data.ts,
         endTs: tripEndTransition.data.ts
      }
      Logger.log("About to pull location data for range "
        + moment.unix(tripStartTransition.data.ts).toString() + " -> " 
        + moment.unix(tripEndTransition.data.ts).toString());
      return UnifiedDataLoader.getUnifiedSensorDataForInterval("background/filtered_location", tq).then(function(locationList) {
          if (locationList.length == 0) {
            return undefined;
          }
          var sortedLocationList = locationList.sort(tsEntrySort);
          var retainInRange = function(loc) {
            return (tripStartTransition.data.ts <= loc.data.ts) && 
                    (loc.data.ts <= tripEndTransition.data.ts)
          }

          var filteredLocationList = sortedLocationList.filter(retainInRange);

          // Fix for https://github.com/e-mission/e-mission-docs/issues/417
          if (filteredLocationList.length == 0) {
            return undefined;
          }

          var tripStartPoint = filteredLocationList[0];
          var tripEndPoint = filteredLocationList[filteredLocationList.length-1];
          Logger.log("tripStartPoint = "+JSON.stringify(tripStartPoint)+"tripEndPoint = "+JSON.stringify(tripEndPoint));
          // if we get a list but our start and end are undefined
          // let's print out the complete original list to get a clue
          // this should help with debugging 
          // https://github.com/e-mission/e-mission-docs/issues/417
          // if it ever occurs again
          if (angular.isUndefined(tripStartPoint) || angular.isUndefined(tripEndPoint)) {
            Logger.log("BUG 417 check: locationList = "+JSON.stringify(locationList));
            Logger.log("transitions: start = "+JSON.stringify(tripStartTransition.data)
                + " end = "+JSON.stringify(tripEndTransition.data.ts));
          }

          const tripProps = points2TripProps(filteredLocationList);

          return {
            ...tripProps,
            start_loc: {
              type: "Point",
              coordinates: [tripStartPoint.data.longitude, tripStartPoint.data.latitude]
            },
            end_loc: {
              type: "Point",
              coordinates: [tripEndPoint.data.longitude, tripEndPoint.data.latitude],
            },
          }
        });
    }

    var linkTrips = function(trip1, trip2) {
        // complete trip1
        trip1.starting_trip = {$oid: trip2.id};
        trip1.exit_fmt_time = trip2.enter_fmt_time;
        trip1.exit_local_dt = trip2.enter_local_dt;
        trip1.exit_ts = trip2.enter_ts;

        // start trip2
        trip2.ending_trip = {$oid: trip1.id};
        trip2.enter_fmt_time = trip1.exit_fmt_time;
        trip2.enter_local_dt = trip1.exit_local_dt;
        trip2.enter_ts = trip1.exit_ts;
    }

    timeline.readUnprocessedTrips = function(startTs, endTs, lastProcessedTrip) {
        $ionicLoading.show({
          template: i18next.t('service.reading-unprocessed-data')
        });

       var tq = {key: "write_ts",
          startTs,
          endTs
       }
       Logger.log("about to query for unprocessed trips from "
         +moment.unix(tq.startTs).toString()+" -> "+moment.unix(tq.endTs).toString());
       return UnifiedDataLoader.getUnifiedMessagesForInterval("statemachine/transition", tq)
        .then(function(transitionList) {
          if (transitionList.length == 0) {
            Logger.log("No unprocessed trips. yay!");
            $ionicLoading.hide();
            return [];
          } else {
            Logger.log("Found "+transitionList.length+" transitions. yay!");
            var sortedTransitionList = transitionList.sort(tsEntrySort);
            /*
            sortedTransitionList.forEach(function(transition) {
                console.log(moment(transition.data.ts * 1000).format()+":" + JSON.stringify(transition.data));
            });
            */
            var tripsList = transitions2Trips(transitionList);
            Logger.log("Mapped into"+tripsList.length+" trips. yay!");
            tripsList.forEach(function(trip) {
                console.log(JSON.stringify(trip));
            });
            var tripFillPromises = tripsList.map(transitionTrip2TripObj);
            return Promise.all(tripFillPromises).then(function(raw_trip_gj_list) {
                // Now we need to link up the trips. linking unprocessed trips
                // to one another is fairly simple, but we need to link the
                // first unprocessed trip to the last processed trip.
                // This might be challenging if we don't have any processed
                // trips for the day. I don't want to go back forever until 
                // I find a trip. So if this is the first trip, we will start a
                // new chain for now, since this is with unprocessed data
                // anyway.

                Logger.log("mapped trips to trip_gj_list of size "+raw_trip_gj_list.length);
                /* Filtering: we will keep trips that are 1) defined and 2) have a distance >= 100m or duration >= 5 minutes
                  https://github.com/e-mission/e-mission-docs/issues/966#issuecomment-1709112578 */
                const trip_gj_list = raw_trip_gj_list.filter((trip) => 
                  trip && (trip.distance >= 100 || trip.duration >= 300)
                );
                Logger.log("after filtering undefined and distance < 100, trip_gj_list size = "+raw_trip_gj_list.length);
                // Link 0th trip to first, first to second, ...
                for (var i = 0; i < trip_gj_list.length-1; i++) {
                    linkTrips(trip_gj_list[i], trip_gj_list[i+1]);
                }
                Logger.log("finished linking trips for list of size "+trip_gj_list.length);
                if (lastProcessedTrip && trip_gj_list.length != 0) {
                    // Need to link the entire chain above to the processed data
                    Logger.log("linking unprocessed and processed trip chains");
                    linkTrips(lastProcessedTrip, trip_gj_list[0]);
                }
                $ionicLoading.hide();
                Logger.log("Returning final list of size "+trip_gj_list.length);
                return trip_gj_list;
            });
          }
        });
    }

    var localCacheReadFn = timeline.updateFromDatabase;

      timeline.getTrip = function(tripId) {
        return angular.isDefined(timeline.data.tripMap)? timeline.data.tripMap[tripId] : undefined;
      };

      timeline.getTripWrapper = function(tripId) {
        return angular.isDefined(timeline.data.tripWrapperMap)? timeline.data.tripWrapperMap[tripId] : undefined;
      };

      timeline.getCompositeTrip = function(tripId) {
        return angular.isDefined(timeline.data.infScrollCompositeTripMap)? timeline.data.infScrollCompositeTripMap[tripId] : undefined;
      };

    timeline.setInfScrollCompositeTripList = function(compositeTripList) {
        timeline.data.infScrollCompositeTripList = compositeTripList;

        timeline.data.infScrollCompositeTripMap = {};

        timeline.data.infScrollCompositeTripList.forEach(function(trip, index, array) {
          timeline.data.infScrollCompositeTripMap[trip._id.$oid] = trip;
        });
    }

    return timeline;
  })

