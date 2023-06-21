

import React, { useEffect, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import TripCard from "./TripCard";
import PlaceCard from "./PlaceCard";
import UntrackedTimeCard from "./UntrackedTimeCard";
import { angularize, getAngularService } from "../angular-react-helper";
import LoadMoreButton from "./LoadMoreButton";
import useAppConfig from "../useAppConfig";
import { useTranslation } from "react-i18next";
import { invalidateMaps } from "./LeafletView";
import { Appbar } from "react-native-paper";
import FilterSelect from "./FilterSelect";
import DateSelect from "./DateSelect";
import Bottleneck from "bottleneck";

let labelPopulateFactory, labelsResultMap, notesResultMap, showPlaces;
const placeLimiter = new Bottleneck({ maxConcurrent: 2, minTime: 500 });
const ONE_DAY = 24 * 60 * 60; // seconds
const ONE_WEEK = ONE_DAY * 7; // seconds

const TimelineScrollList = ({ ...otherProps }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { appConfig, loading } = useAppConfig();
  const { t } = useTranslation();

  const [filterInputs, setFilterInputs] = useState([]);
  const [pipelineRange, setPipelineRange] = useState({ start_ts: 0, end_ts: 0 });
  const [oldestSelectedTs, setOldestSelectedTs] = useState(0);
  const [latestSelectedTs, setLatestSelectedTs] = useState(0);
  const [oldestLoadedTs, setOldestLoadedTs] = useState(0);
  const [latestLoadedTs, setLatestLoadedTs] = useState(0);
  const [allTrips, setAllTrips] = useState([]);
  const [displayTrips, setDisplayTrips] = useState([]);
  const [listEntries, setListEntries] = useState([]);

  const $rootScope = getAngularService('$rootScope');
  const $state = getAngularService('$state');
  const $ionicPopup = getAngularService('$ionicPopup');
  const Timeline = getAngularService('Timeline');
  const DiaryHelper = getAngularService('DiaryHelper');
  const ImperialConfig = getAngularService('ImperialConfig');
  const SurveyOptions = getAngularService('SurveyOptions');
  const enbs = getAngularService('EnketoNotesButtonService');

  // initialization, once the appConfig is loaded
  useEffect(() => {
    if (loading) return;
    const surveyOptKey = appConfig.survey_info['trip-labels'];
    const surveyOpt = SurveyOptions[surveyOptKey];
    showPlaces = appConfig.survey_info?.buttons?.['place-notes'];
    labelPopulateFactory = getAngularService(surveyOpt.service);
    const tripSurveyName = appConfig.survey_info?.buttons?.['trip-notes']?.surveyName;
    const placeSurveyName = appConfig.survey_info?.buttons?.['place-notes']?.surveyName;
    enbs.initConfig(tripSurveyName, placeSurveyName);

    checkPermissionsStatus();

    // we will show filters if 'additions' are not configured
    // https://github.com/e-mission/e-mission-docs/issues/894
    if (appConfig.survey_info?.buttons == undefined) {
      // initalize filters
      const tripFilterFactory = getAngularService(surveyOpt.filter);
      const allFalseFilters = tripFilterFactory.configuredFilters.map((f, i) => ({
        ...f, state: (i == 0 ? true : false) // only the first filter will have state true on init
      }));
      setFilterInputs(allFalseFilters);
    }
    loadTimelineEntries();
  }, [appConfig, loading]);

  useEffect(() => {
    if (loading) return;
    if (oldestSelectedTs && oldestSelectedTs < oldestLoadedTs) {
      readDataFromServer(oldestSelectedTs, oldestLoadedTs, 'past');
    } else if (latestSelectedTs && latestSelectedTs > latestLoadedTs) {
      readDataFromServer(latestLoadedTs, latestSelectedTs, 'future');
    } else {
      // nothing new to load
    }
  }, [oldestSelectedTs, latestSelectedTs]);

  useEffect(() => {
    Timeline.setInfScrollCompositeTripList(allTrips);
    const oldestTrip = allTrips[0];
    const [latestTrip] = allTrips.slice(-1);
    updateLoadedRange(oldestTrip, latestTrip);
    if (oldestTrip && oldestTrip.start_ts > pipelineRange.start_ts) {
      setOldestLoadedTs(oldestTrip.start_ts - 1);
    } else if (latestTrip && latestTrip.end_ts < pipelineRange.end_ts) {
      setLatestLoadedTs(latestTrip.end_ts + 1);
    }
    const activeFilter = filterInputs?.find((f) => f.state == true);
    if (activeFilter) {
      setDisplayTrips(allTrips.filter(
        t => (t.waitingForMod == true) || activeFilter?.filter(t)
      ));
    } else {
      setDisplayTrips(allTrips);
    }
  }, [allTrips, filterInputs]);

  const listRef = useRef(null);

  function loadTimelineEntries() {
    Timeline.getUnprocessedLabels(labelPopulateFactory, enbs).then(([pipelineRange, manualResultMap, enbsResultMap]) => {
      if (pipelineRange.end_ts) {
        labelsResultMap = manualResultMap;
        notesResultMap = enbsResultMap;
        console.log("After reading in the label controller, manualResultMap " + JSON.stringify(manualResultMap), manualResultMap);
        setPipelineRange(pipelineRange);
        setOldestLoadedTs(pipelineRange.end_ts);
        setOldestSelectedTs(pipelineRange.end_ts - ONE_WEEK);
        setLatestLoadedTs(pipelineRange.end_ts);
        setLatestSelectedTs(pipelineRange.end_ts);
      }
    });
  }

  function refresh() {
    Timeline.getUnprocessedLabels(labelPopulateFactory, enbs).then(([pipelineRange, manualResultMap, enbsResultMap]) => {
      setOldestSelectedTs(pipelineRange.end_ts - ONE_WEEK);
      setLatestSelectedTs(pipelineRange.end_ts);
      readDataFromServer(pipelineRange.end_ts - ONE_WEEK, pipelineRange.end_ts);
    });
  }

  function loadMoreTrips(when) {
    const reachedPipelineStart = oldestLoadedTs <= pipelineRange.start_ts;
    const reachedPipelineEnd = latestLoadedTs >= pipelineRange.end_ts;
    if (!oldestLoadedTs) {
      console.warn("trying to read data too early, early return");
      return;
    }
    if (when == 'past' && !reachedPipelineStart) {
      setOldestSelectedTs(oldestLoadedTs - ONE_WEEK);
    } else if (when == 'future' && !reachedPipelineEnd) {
      setLatestSelectedTs(latestLoadedTs + ONE_WEEK);
    }
  }

  /* direction: 'past' if we are loading older trips, 'future' if we are loading newer trips,
      if not given, we are replacing the current list with only the new trips */
  function readDataFromServer(startTs: number, endTs: number, direction?: string) {
    if (!oldestLoadedTs) {
      console.warn("trying to read data too early, early return");
      return;
    }

    const readCompositePromise = Timeline.readAllCompositeTrips(startTs, endTs);
    let readUnprocessedPromise;
    if (endTs >= pipelineRange.end_ts) {
      const nowTs = new Date().getTime() / 1000;
      readUnprocessedPromise = Timeline.readUnprocessedTrips(pipelineRange.end_ts, nowTs, allTrips);
    } else {
      readUnprocessedPromise = Promise.resolve([]);
    }
    return Promise.all([readCompositePromise, readUnprocessedPromise]).then(([ctList, utList]) => {
      const tripsRead = ctList.concat(utList);
      populateCompositeTrips(tripsRead);
      // Fill place names and trajectories on a reversed copy of the list so we fill from the bottom up
      tripsRead.slice().reverse().forEach(function (trip, index) {
        trip.geojson = Timeline.compositeTrip2Geojson(trip);
        fillPlacesForTripAsync(trip);
      });
      if (direction == 'future') {
        setAllTrips(allTrips.concat(tripsRead));
      } else if (direction == 'past') {
        setAllTrips(tripsRead.concat(allTrips));
      } else {
        setAllTrips(tripsRead);
      }
    }).catch((err) => {
      console.error("while reading confirmed trips", err);
    });
  };

  function fillPlacesForTripAsync(trip) {
    const fillPromises = [
      placeLimiter.schedule(() =>
        DiaryHelper.getNominatimLocName(trip.start_loc)),
      placeLimiter.schedule(() =>
        DiaryHelper.getNominatimLocName(trip.end_loc)),
    ];
    Promise.all(fillPromises).then(function ([startName, endName]) {
      if (trip.start_confirmed_place) {
        trip.start_confirmed_place.display_name = startName;
        trip.start_confirmed_place.onChanged?.(); /* Temporary hack, see below */
      }
      trip.start_display_name = startName;
      trip.end_display_name = endName;
      if (trip.end_confirmed_place) {
        trip.end_confirmed_place.display_name = endName;
        trip.end_confirmed_place.onChanged?.(); /* Temporary hack, see below */
      }
      trip.onChanged?.(); /* Temporary hack for React to update when
                                      data changes in Angular.
                                    Will not be needed later. */
    });
  }

  function updateLoadedRange(oldestTrip, latestTrip) {
    if (oldestTrip && oldestTrip.start_ts <= pipelineRange.start_ts) {
      setOldestLoadedTs(oldestTrip.start_ts);
    }
    if (latestTrip && latestTrip.end_ts >= pipelineRange.end_ts) {
      setLatestLoadedTs(latestTrip.end_ts);
    }
  }

  function updateTimeRange(oldestTrip, latestTrip) {

  }

  useEffect(() => {
    if (!displayTrips?.length) return;
    const newListEntries = [];
    displayTrips.forEach((cTrip) => {
      const start_place = cTrip.start_confirmed_place;
      const end_place = cTrip.end_confirmed_place;

      // Add start place to the list, if not already present
      let isInList = newListEntries.find(e => e._id?.$oid == start_place?._id.$oid);
      if (showPlaces && start_place && !isInList) {
        // Only display places with duration >= 60 seconds, or with no duration (i.e. currently ongoing)
        if (isNaN(start_place.duration) || start_place.duration >= 60) {
          newListEntries.push(start_place);
        }
      }

      /* don't display untracked time if the trips that came before and
          after it are not displayed */
      if (cTrip.key.includes('untracked')) {
        const prevTrip = allTrips[allTrips.indexOf(cTrip) - 1];
        const nextTrip = allTrips[allTrips.indexOf(cTrip) + 1];
        const prevTripDisplayed = displayTrips.includes(prevTrip);
        const nextTripDisplayed = displayTrips.includes(nextTrip);
        if (prevTrip && !prevTripDisplayed || nextTrip && !nextTripDisplayed) {
          return;
        }
      }

      // Add trip to the list
      newListEntries.push(cTrip);

      // Add end place to the list
      if (showPlaces && end_place) {
        // Only display places with duration >= 60 seconds, or with no duration (i.e. currently ongoing)
        if (isNaN(end_place.duration) || end_place.duration >= 60) {
          newListEntries.push(end_place);
        }
      }
    });
    setListEntries(newListEntries);
  }, [displayTrips]);

  useEffect(() => {
    invalidateMaps();
  }, [listEntries]);

  function checkPermissionsStatus() {
    $rootScope.$broadcast("recomputeAppStatus", (status) => {
      if (!status) {
        $ionicPopup.show({
          title: t('control.incorrect-app-status'),
          template: t('control.fix-app-status'),
          scope: $rootScope,
          buttons: [{
            text: t('control.fix'),
            type: 'button-assertive',
            onTap: function (e) {
              $state.go('root.main.control', { launchAppStatusModal: 1 });
              return false;
            }
          }]
        });
      }
    });
  }

  function populateCompositeTrips(ctList) {
    ctList.forEach((ct, i) => {
      if (showPlaces && ct.start_confirmed_place) {
        const cp = ct.start_confirmed_place;
        cp.getNextEntry = () => ctList[i];
        populateBasicClasses(cp);
        labelPopulateFactory.populateInputsAndInferences(cp, labelsResultMap);
        enbs.populateInputsAndInferences(cp, notesResultMap);
      }
      if (showPlaces && ct.end_confirmed_place) {
        const cp = ct.end_confirmed_place;
        cp.getNextEntry = () => ctList[i + 1];
        populateBasicClasses(cp);
        labelPopulateFactory.populateInputsAndInferences(cp, labelsResultMap);
        enbs.populateInputsAndInferences(cp, notesResultMap);
        ct.getNextEntry = () => cp;
      } else {
        ct.getNextEntry = () => ctList[i + 1];
      }
      populateBasicClasses(ct);
      labelPopulateFactory.populateInputsAndInferences(ct, labelsResultMap);
      enbs.populateInputsAndInferences(ct, notesResultMap);
    });
  }

  function populateBasicClasses(tlEntry) {
    const beginTs = tlEntry.start_ts || tlEntry.enter_ts;
    const endTs = tlEntry.end_ts || tlEntry.exit_ts;
    const beginDt = tlEntry.start_local_dt || tlEntry.enter_local_dt;
    const endDt = tlEntry.end_local_dt || tlEntry.exit_local_dt;
    const isMultiDay = DiaryHelper.isMultiDay(beginTs, endTs);
    tlEntry.display_date = DiaryHelper.getFormattedDate(beginTs, endTs, isMultiDay);
    tlEntry.display_start_time = DiaryHelper.getLocalTimeString(beginDt);
    tlEntry.display_end_time = DiaryHelper.getLocalTimeString(endDt);
    if (isMultiDay) {
      tlEntry.display_start_date_abbr = DiaryHelper.getFormattedDateAbbr(beginTs);
      tlEntry.display_end_date_abbr = DiaryHelper.getFormattedDateAbbr(endTs);
    }
    tlEntry.display_duration = DiaryHelper.getFormattedDuration(beginTs, endTs);
    tlEntry.display_time = DiaryHelper.getFormattedTimeRange(beginTs, endTs);
    if (tlEntry.distance) {
      tlEntry.display_distance = ImperialConfig.getFormattedDistance(tlEntry.distance);
      tlEntry.display_distance_suffix = ImperialConfig.getDistanceSuffix;
    }
    tlEntry.percentages = DiaryHelper.getPercentages(tlEntry);
    // Pre-populate start and end names with &nbsp; so they take up the same amount of vertical space in the UI before they are populated with real data
    tlEntry.start_display_name = "\xa0";
    tlEntry.end_display_name = "\xa0";
  }

  const renderCard = ({ item: listEntry }) => {
    if (listEntry.origin_key.includes('trip')) {
      return <TripCard trip={listEntry} />
    } else if (listEntry.origin_key.includes('place')) {
      return <PlaceCard place={listEntry} />
    } else if (listEntry.origin_key.includes('untracked')) {
      return <UntrackedTimeCard triplike={listEntry} />
    }
  };

  const header =  <LoadMoreButton onPressFn={() => loadMoreTrips('future')}>
                      Show More Travel
                  </LoadMoreButton>;
  const footer =  <LoadMoreButton onPressFn={() => loadMoreTrips('past')}>
                      Show Older Travel
                  </LoadMoreButton>;
  const separator = () => <View style={{ height: 8 }} />

  // The way that FlashList inverts the scroll view means we have to reverse the order of items too
  const reversedListEntries = listEntries ? [...listEntries].reverse() : [];

  return (<>
    <Appbar.Header statusBarHeight={12} elevated={true} style={{height: 46, backgroundColor: 'white'}}>
      <FilterSelect filters={filterInputs}
                    setFilters={setFilterInputs}
                    numListDisplayed={displayTrips.length}
                    numListTotal={allTrips.length} />
      <DateSelect tsRange={{ oldestTs: oldestLoadedTs, latestTs: latestLoadedTs }}
                  setOldest={setOldestSelectedTs}
                  setLatest={setLatestSelectedTs} />
      <Appbar.Action icon="refresh" onPress={() => refresh()} />
    </Appbar.Header>
    <View style={{ flex: 1, maxHeight: windowHeight - 160 }}>
      {listEntries && listEntries.length > 0 &&
        <FlashList inverted
          ref={listRef}
          data={reversedListEntries}
          renderItem={renderCard}
          estimatedItemSize={240}
          estimatedFirstItemOffset={80}
          estimatedListSize={{ width: windowWidth, height: 200 * listEntries.length }}
          keyExtractor={(item) => item._id.$oid}
          /* TODO: We can capture onScroll events like this, so we should be able to automatically
                load more trips when the user is approaching the bottom or top of the list.
                This might be a nicer experience than the current header and footer buttons. */
          // onScroll={e => console.debug(e.nativeEvent.contentOffset.y)}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ItemSeparatorComponent={separator}
          {...otherProps} />
      }
    </View>
  </>);
}

angularize(TimelineScrollList, 'emission.main.diary.timelinescrolllist');
export default TimelineScrollList;
