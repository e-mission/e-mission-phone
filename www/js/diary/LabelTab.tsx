/* LabelTab is the root component for the label tab. It is a stack navigator
    that has two screens: LabelListScreen and LabelScreenDetails.
  LabelListScreen is the main screen, which is a scrollable list of timeline entries,
    while LabelScreenDetails is the view that shows when the user clicks on a trip.
  LabelTabContext is provided to the entire child tree and allows the screens to
    share the data that has been loaded and interacted with.
*/

import React, { useEffect, useMemo, useState } from "react";
import { angularize, getAngularService } from "../angular-react-helper";
import useAppConfig from "../useAppConfig";
import { useTranslation } from "react-i18next";
import { invalidateMaps } from "../components/LeafletView";
import Bottleneck from "bottleneck";
import moment from "moment";
import LabelListScreen from "./LabelListScreen";
import { createStackNavigator } from "@react-navigation/stack";
import LabelScreenDetails from "./LabelDetailsScreen";
import { NavigationContainer } from "@react-navigation/native";

let labelPopulateFactory, labelsResultMap, notesResultMap, showPlaces;
const placeLimiter = new Bottleneck({ maxConcurrent: 2, minTime: 500 });
const ONE_DAY = 24 * 60 * 60; // seconds
const ONE_WEEK = ONE_DAY * 7; // seconds
export const LabelTabContext = React.createContext<any>(null);

const LabelTab = () => {
  const { appConfig, loading } = useAppConfig();
  const { t } = useTranslation();

  const [surveyOpt, setSurveyOpt] = useState(null);
  const [filterInputs, setFilterInputs] = useState([]);
  const [pipelineRange, setPipelineRange] = useState(null);
  const [queriedRange, setQueriedRange] = useState(null);
  const [allTrips, setAllTrips] = useState([]);
  const [displayTrips, setDisplayTrips] = useState([]);
  const [listEntries, setListEntries] = useState([]);
  const [refreshTime, setRefreshTime] = useState(null);
  const [isLoading, setIsLoading] = useState<string|false>('replace');

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
    setSurveyOpt(surveyOpt);
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
  }, [appConfig, loading, refreshTime]);

  useEffect(() => {
    Timeline.setInfScrollCompositeTripList(allTrips);
    const activeFilter = filterInputs?.find((f) => f.state == true);
    if (activeFilter) {
      setDisplayTrips(allTrips.filter(
        t => (t.waitingForMod == true) || activeFilter?.filter(t)
      ));
    } else {
      setDisplayTrips(allTrips);
    }
  }, [allTrips, filterInputs]);

  function loadTimelineEntries() {
    Timeline.getUnprocessedLabels(labelPopulateFactory, enbs).then(([pipelineRange, manualResultMap, enbsResultMap]) => {
      if (pipelineRange.end_ts) {
        labelsResultMap = manualResultMap;
        notesResultMap = enbsResultMap;
        console.log("After reading in the label controller, manualResultMap " + JSON.stringify(manualResultMap), manualResultMap);
        setPipelineRange(pipelineRange);
      }
    });
  }

  // once pipelineRange is set, load the most recent week of data
  useEffect(() => {
    if (pipelineRange) {
      loadAnotherWeek('past');
    }
  }, [pipelineRange]);

  function refresh() {
    setIsLoading('replace');
    setAllTrips([]);
    setRefreshTime(new Date());
  }

  async function loadAnotherWeek(when: 'past'|'future') {
    const reachedPipelineStart = queriedRange?.start_ts && queriedRange.start_ts <= pipelineRange.start_ts;
    const reachedPipelineEnd = queriedRange?.end_ts && queriedRange.end_ts >= pipelineRange.end_ts;

    if (!queriedRange) {
      // first time loading
      if(!isLoading) setIsLoading('replace');
      const nowTs = new Date().getTime() / 1000;
      const [ctList, utList] = await fetchTripsInRange(pipelineRange.end_ts - ONE_WEEK, nowTs);
      handleFetchedTrips(ctList, utList, 'replace');
      setQueriedRange({start_ts: pipelineRange.end_ts - ONE_WEEK, end_ts: nowTs});
    } else if (when == 'past' && !reachedPipelineStart) {
      if(!isLoading) setIsLoading('prepend');
      const fetchStartTs = Math.max(queriedRange.start_ts - ONE_WEEK, pipelineRange.start_ts);
      const [ctList, utList] = await fetchTripsInRange(queriedRange.start_ts - ONE_WEEK, queriedRange.start_ts - 1);
      handleFetchedTrips(ctList, utList, 'prepend');
      setQueriedRange({start_ts: fetchStartTs, end_ts: queriedRange.end_ts})
    } else if (when == 'future' && !reachedPipelineEnd) {
      if(!isLoading) setIsLoading('append');
      const fetchEndTs = Math.min(queriedRange.end_ts + ONE_WEEK, pipelineRange.end_ts);
      const [ctList, utList] = await fetchTripsInRange(queriedRange.end_ts + 1, fetchEndTs);
      handleFetchedTrips(ctList, utList, 'append');
      setQueriedRange({start_ts: queriedRange.start_ts, end_ts: fetchEndTs})
    }
  }

  async function loadSpecificWeek(day: string) {
    if (!isLoading) setIsLoading('replace');
    const threeDaysBefore = moment(day).subtract(3, 'days').unix();
    const threeDaysAfter = moment(day).add(3, 'days').unix();
    const [ctList, utList] = await fetchTripsInRange(threeDaysBefore, threeDaysAfter);
    handleFetchedTrips(ctList, utList, 'replace');
    setQueriedRange({start_ts: threeDaysBefore, end_ts: threeDaysAfter});
  }

  function handleFetchedTrips(ctList, utList, mode: 'prepend' | 'append' | 'replace') {
    const tripsRead = ctList.concat(utList);
    populateCompositeTrips(tripsRead);
    // Fill place names and trajectories on a reversed copy of the list so we fill from the bottom up
    tripsRead.slice().reverse().forEach(function (trip, index) {
      trip.geojson = Timeline.compositeTrip2Geojson(trip);
      fillPlacesForTripAsync(trip);
    });
    if (mode == 'append') {
      setAllTrips(allTrips.concat(tripsRead));
    } else if (mode == 'prepend') {
      setAllTrips(tripsRead.concat(allTrips));
    } else if (mode == 'replace') {
      setAllTrips(tripsRead);
    }
  }

  async function fetchTripsInRange(startTs: number, endTs: number) {
    if (!pipelineRange.start_ts) {
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
    const results = await Promise.all([readCompositePromise, readUnprocessedPromise]);
    if (queriedRange &&
        (startTs >= queriedRange.start_ts && startTs <= queriedRange.end_ts
        || endTs >= queriedRange.start_ts && endTs <= queriedRange.end_ts)) {
        // we just expanded on the existing range, so update
        setQueriedRange({
          start_ts: Math.min(startTs, queriedRange.start_ts),
          end_ts: Math.max(endTs, queriedRange.end_ts)
        });
    } else {
      // this range didn't overlap with the existing range, so replace
      setQueriedRange({start_ts: startTs, end_ts: endTs});
    }
    return results;
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
    if (!listEntries?.length) return;
    invalidateMaps();
    setIsLoading(false);
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

  async function repopulateTimelineEntry(oid: string) {
    const [_, newLabels, newNotes] = await Timeline.getUnprocessedLabels(labelPopulateFactory, enbs);
    const index = listEntries.findIndex(x=> x._id.$oid === oid);
    if (index < 0)
      return console.error("Item with oid: " + oid + " not found in list");
    const newEntry = {...listEntries[index]};
    populateBasicClasses(newEntry);
    labelPopulateFactory.populateInputsAndInferences(newEntry, newLabels);
    enbs.populateInputsAndInferences(newEntry, newNotes);
    setListEntries([
      ...listEntries.slice(0, index),
      newEntry,
      ...listEntries.slice(index + 1)
    ]);
  }

  function updateListEntry(oid: string, newAttributes: object) {
    const index = listEntries.findIndex(x=> x._id.$oid === oid);
    if (index < 0)
      console.error("Item with oid: " + oid + " not found in list");
    else
      setListEntries([
        ...listEntries.slice(0, index),
        Object.assign({}, listEntries[index], newAttributes),
        ...listEntries.slice(index + 1)
      ]);
  }

  const contextVals = {
    surveyOpt,
    allTrips,
    displayTrips,
    listEntries,
    filterInputs,
    setFilterInputs,
    queriedRange,
    pipelineRange,
    isLoading,
    loadAnotherWeek,
    loadSpecificWeek,
    refresh,
    updateListEntry,
    repopulateTimelineEntry,
  }

  const Tab = createStackNavigator();

  return (
    <LabelTabContext.Provider value={contextVals}>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{headerShown: false, animationEnabled: true}}>
          <Tab.Screen name="label.main" component={LabelListScreen} />
          <Tab.Screen name="label.details" component={LabelScreenDetails}
                      /* When we go to the details screen, we want to keep the main screen in memory
                        so that we can go right back to it and the scroll position will be preserved.
                        This is what `detachPreviousScreen:false` does. */
                      options={{detachPreviousScreen: false}} />
        </Tab.Navigator>
      </NavigationContainer>
    </LabelTabContext.Provider>
  );
}

angularize(LabelTab, 'LabelTab', 'emission.main.diary.labeltab');
export default LabelTab;
