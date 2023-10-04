/* LabelTab is the root component for the label tab. It is a stack navigator
    that has two screens: LabelListScreen and LabelScreenDetails.
  LabelListScreen is the main screen, which is a scrollable list of timeline entries,
    while LabelScreenDetails is the view that shows when the user clicks on a trip.
  LabelTabContext is provided to the entire child tree and allows the screens to
    share the data that has been loaded and interacted with.
*/

import React, { useEffect, useState, useRef } from "react";
import { getAngularService } from "../angular-react-helper";
import useAppConfig from "../useAppConfig";
import { useTranslation } from "react-i18next";
import { invalidateMaps } from "../components/LeafletView";
import moment from "moment";
import LabelListScreen from "./list/LabelListScreen";
import { createStackNavigator } from "@react-navigation/stack";
import LabelScreenDetails from "./details/LabelDetailsScreen";
import { NavigationContainer } from "@react-navigation/native";
import { compositeTrips2TimelineMap, getAllUnprocessedInputs, getLocalUnprocessedInputs, populateCompositeTrips } from "./timelineHelper";
import { fillLocationNamesOfTrip, resetNominatimLimiter } from "./addressNamesHelper";
import { SurveyOptions } from "../survey/survey";
import { getLabelOptions } from "../survey/multilabel/confirmHelper";
import { displayError } from "../plugin/logger";
import { useTheme } from "react-native-paper";

let labelPopulateFactory, labelsResultMap, notesResultMap, showPlaces;
const ONE_DAY = 24 * 60 * 60; // seconds
const ONE_WEEK = ONE_DAY * 7; // seconds
export const LabelTabContext = React.createContext<any>(null);

const LabelTab = () => {
  const appConfig = useAppConfig();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [surveyOpt, setSurveyOpt] = useState(null);
  const [labelOptions, setLabelOptions] = useState(null);
  const [filterInputs, setFilterInputs] = useState([]);
  const [pipelineRange, setPipelineRange] = useState(null);
  const [queriedRange, setQueriedRange] = useState(null);
  const [timelineMap, setTimelineMap] = useState(null);
  const [displayedEntries, setDisplayedEntries] = useState(null);
  const [refreshTime, setRefreshTime] = useState(null);
  const [isLoading, setIsLoading] = useState<string|false>('replace');

  const $rootScope = getAngularService('$rootScope');
  const $state = getAngularService('$state');
  const $ionicPopup = getAngularService('$ionicPopup');
  const Logger = getAngularService('Logger');
  const Timeline = getAngularService('Timeline');
  const CommHelper = getAngularService('CommHelper');
  const enbs = getAngularService('EnketoNotesButtonService');

  // initialization, once the appConfig is loaded
  useEffect(() => {
    if (!appConfig) return;
    const surveyOptKey = appConfig.survey_info['trip-labels'];
    const surveyOpt = SurveyOptions[surveyOptKey];
    setSurveyOpt(surveyOpt);
    showPlaces = appConfig.survey_info?.buttons?.['place-notes'];
    getLabelOptions(appConfig).then((labelOptions) => setLabelOptions(labelOptions));
    labelPopulateFactory = getAngularService(surveyOpt.service);
    const tripSurveyName = appConfig.survey_info?.buttons?.['trip-notes']?.surveyName;
    const placeSurveyName = appConfig.survey_info?.buttons?.['place-notes']?.surveyName;
    enbs.initConfig(tripSurveyName, placeSurveyName);

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
  }, [appConfig, refreshTime]);

  // whenever timelineMap is updated, update the displayedEntries
  // according to the active filter
  useEffect(() => {
    if (!timelineMap) return setDisplayedEntries(null);
    const allEntries = Array.from<any>(timelineMap.values());
    const activeFilter = filterInputs?.find((f) => f.state == true);
    let entriesToDisplay = allEntries;
    if (activeFilter) {
      const entriesAfterFilter = allEntries.filter(
        t => t.justRepopulated || activeFilter?.filter(t)
      );
      /* next, filter out any untracked time if the trips that came before and
        after it are no longer displayed */
      entriesToDisplay = entriesAfterFilter.filter((tlEntry) => {
        if (!tlEntry.origin_key.includes('untracked')) return true;
        const prevTrip = allEntries[allEntries.indexOf(tlEntry) - 1];
        const nextTrip = allEntries[allEntries.indexOf(tlEntry) + 1];
        const prevTripDisplayed = entriesAfterFilter.includes(prevTrip);
        const nextTripDisplayed = entriesAfterFilter.includes(nextTrip);
        // if either the trip before or after is displayed, then keep the untracked time
        return prevTripDisplayed || nextTripDisplayed;
      });
    }
    setDisplayedEntries(entriesToDisplay);
  }, [timelineMap, filterInputs]);

  async function loadTimelineEntries() {
    try {
      const pipelineRange = await CommHelper.getPipelineRangeTs();
      [labelsResultMap, notesResultMap] = await getAllUnprocessedInputs(pipelineRange, labelPopulateFactory, enbs);
      Logger.log("After reading unprocessedInputs, labelsResultMap =" + JSON.stringify(labelsResultMap)
                                                + "; notesResultMap = " + JSON.stringify(notesResultMap));
      setPipelineRange(pipelineRange);
    } catch (error) {
      Logger.displayError("Error while loading pipeline range", error);
      setIsLoading(false);
    }
  }

  // once pipelineRange is set, load the most recent week of data
  useEffect(() => {
    if (pipelineRange && pipelineRange.end_ts) {
      loadAnotherWeek('past');
    }
  }, [pipelineRange]);

  function refresh() {
    setIsLoading('replace');
    resetNominatimLimiter();
    setQueriedRange(null);
    setTimelineMap(null);
    setRefreshTime(new Date());
  }

  async function loadAnotherWeek(when: 'past'|'future') {
    try {
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
    } catch (e) {
      setIsLoading(false);
      displayError(e, t('errors.while-loading-another-week', {when: when}));
    }
  }

  async function loadSpecificWeek(day: string) {
    try {
      if (!isLoading) setIsLoading('replace');
      resetNominatimLimiter();
      const threeDaysBefore = moment(day).subtract(3, 'days').unix();
      const threeDaysAfter = moment(day).add(3, 'days').unix();
      const [ctList, utList] = await fetchTripsInRange(threeDaysBefore, threeDaysAfter);
      handleFetchedTrips(ctList, utList, 'replace');
      setQueriedRange({start_ts: threeDaysBefore, end_ts: threeDaysAfter});
    } catch (e) {
      setIsLoading(false);
      displayError(e, t('errors.while-loading-specific-week', {day: day}));
    }
  }

  function handleFetchedTrips(ctList, utList, mode: 'prepend' | 'append' | 'replace') {
    const tripsRead = ctList.concat(utList);
    populateCompositeTrips(tripsRead, showPlaces, labelPopulateFactory, labelsResultMap, enbs, notesResultMap);
    // Fill place names on a reversed copy of the list so we fill from the bottom up
    tripsRead.slice().reverse().forEach(function (trip, index) {
      fillLocationNamesOfTrip(trip);
    });
    const readTimelineMap = compositeTrips2TimelineMap(tripsRead, showPlaces);
    if (mode == 'append') {
      setTimelineMap(new Map([...timelineMap, ...readTimelineMap]));
    } else if (mode == 'prepend') {
      setTimelineMap(new Map([...readTimelineMap, ...timelineMap]));
    } else if (mode == 'replace') {
      setTimelineMap(readTimelineMap);
    } else {
      return console.error("Unknown insertion mode " + mode);
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
      const lastProcessedTrip = timelineMap && [...timelineMap?.values()].reverse().find(
        trip => trip.origin_key.includes('confirmed_trip')
      );
      readUnprocessedPromise = Timeline.readUnprocessedTrips(pipelineRange.end_ts, nowTs, lastProcessedTrip);
    } else {
      readUnprocessedPromise = Promise.resolve([]);
    }
    const results = await Promise.all([readCompositePromise, readUnprocessedPromise]);
    return results;
  };

  useEffect(() => {
    if (!displayedEntries) return;
    invalidateMaps();
    setIsLoading(false);
  }, [displayedEntries]);

  const timelineMapRef = useRef(timelineMap);
  async function repopulateTimelineEntry(oid: string) {
    if (!timelineMap.has(oid)) return console.error("Item with oid: " + oid + " not found in timeline");
    const [newLabels, newNotes] = await getLocalUnprocessedInputs(pipelineRange, labelPopulateFactory, enbs);
    const repopTime = new Date().getTime();
    const newEntry = {...timelineMap.get(oid), justRepopulated: repopTime};
    labelPopulateFactory.populateInputsAndInferences(newEntry, newLabels);
    enbs.populateInputsAndInferences(newEntry, newNotes);
    const newTimelineMap = new Map(timelineMap).set(oid, newEntry);
    setTimelineMap(newTimelineMap);

    // after 30 seconds, remove the justRepopulated flag unless it was repopulated again since then
    /* ref is needed to avoid stale closure:
      https://legacy.reactjs.org/docs/hooks-faq.html#why-am-i-seeing-stale-props-or-state-inside-my-function */
    timelineMapRef.current = newTimelineMap;
    setTimeout(() => {
      const entry = {...timelineMapRef.current.get(oid)};
      if (entry.justRepopulated != repopTime)
        return console.log("Entry " + oid + " was repopulated again, skipping");
      const newTimelineMap = new Map(timelineMapRef.current).set(oid, {...entry, justRepopulated: false});
      setTimelineMap(newTimelineMap);
    }, 30000);
  }

  const contextVals = {
    surveyOpt,
    labelOptions,
    timelineMap,
    displayedEntries,
    filterInputs,
    setFilterInputs,
    queriedRange,
    pipelineRange,
    isLoading,
    loadAnotherWeek,
    loadSpecificWeek,
    refresh,
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

export default LabelTab;
