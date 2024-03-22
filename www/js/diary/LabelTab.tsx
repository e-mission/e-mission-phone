/* LabelTab is the root component for the label tab. It is a stack navigator
    that has two screens: LabelListScreen and LabelScreenDetails.
  LabelListScreen is the main screen, which is a scrollable list of timeline entries,
    while LabelScreenDetails is the view that shows when the user clicks on a trip.
*/

import React, { useEffect, useState, useContext, createContext } from 'react';
import { useTranslation } from 'react-i18next';
import LabelListScreen from './list/LabelListScreen';
import { createStackNavigator } from '@react-navigation/stack';
import LabelScreenDetails from './details/LabelDetailsScreen';
import { NavigationContainer } from '@react-navigation/native';
import { updateAllUnprocessedInputs } from './timelineHelper';
import { fillLocationNamesOfTrip } from './addressNamesHelper';
import { logDebug } from '../plugin/logger';
import { configuredFilters as multilabelConfiguredFilters } from '../survey/multilabel/infinite_scroll_filters';
import { configuredFilters as enketoConfiguredFilters } from '../survey/enketo/infinite_scroll_filters';
import { TimelineEntry } from '../types/diaryTypes';
import TimelineContext, { LabelTabFilter, TimelineLabelMap } from '../TimelineContext';
import { AppContext } from '../App';
import { subscribe } from '../customEventHandler';

type LabelContextProps = {
  displayedEntries: TimelineEntry[] | null;
  filterInputs: LabelTabFilter[];
  setFilterInputs: (filters: LabelTabFilter[]) => void;
};
export const LabelTabContext = createContext<LabelContextProps>({} as LabelContextProps);

const LabelTab = () => {
  const { appConfig } = useContext(AppContext);
  const { pipelineRange, timelineMap, loadAnotherWeek } = useContext(TimelineContext);

  const [filterInputs, setFilterInputs] = useState<LabelTabFilter[]>([]);
  const [displayedEntries, setDisplayedEntries] = useState<TimelineEntry[] | null>(null);

  useEffect(() => {
    // we will show filters if 'additions' are not configured
    // https://github.com/e-mission/e-mission-docs/issues/894
    if (appConfig.survey_info?.buttons == undefined) {
      // initalize filters
      const tripFilters =
        appConfig.survey_info?.['trip-labels'] == 'ENKETO'
          ? enketoConfiguredFilters
          : multilabelConfiguredFilters;
      const allFalseFilters = tripFilters.map((f, i) => ({
        ...f,
        state: i == 0 ? true : false, // only the first filter will have state true on init
      }));
      setFilterInputs(allFalseFilters);
    }

    subscribe('applyLabelTabFilters', (e) => {
      logDebug('applyLabelTabFilters event received, calling applyFilters');
      applyFilters(e.detail.timelineMap, e.detail.timelineLabelMap || {});
    });
  }, [appConfig]);

  useEffect(() => {
    if (!timelineMap) return;
    const tripsRead = Object.values(timelineMap || {});
    tripsRead
      .slice()
      .reverse()
      .forEach((trip) => fillLocationNamesOfTrip(trip));
  }, [timelineMap]);

  function applyFilters(timelineMap, labelMap: TimelineLabelMap) {
    const allEntries: TimelineEntry[] = Array.from(timelineMap.values());
    const activeFilter = filterInputs?.find((f) => f.state == true);
    let entriesToDisplay = allEntries;
    if (activeFilter) {
      const cutoffTs = new Date().getTime() / 1000 - 30; // 30s ago, as epoch seconds
      const entriesAfterFilter = allEntries.filter((e) => {
        // if the entry has a recently recorded user input, it is immune to filtering
        const labels = labelMap[e._id.$oid];
        for (let labelValue of Object.values(labels || [])) {
          logDebug(`LabelTab filtering: labelValue = ${JSON.stringify(labelValue)}`);
          if (labelValue?.metadata?.write_ts > cutoffTs) {
            logDebug('LabelTab filtering: entry has recent user input, keeping');
            return true;
          }
        }
        // otherwise, just apply the filter
        return activeFilter?.filter(e, labelMap[e._id.$oid]);
      });
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
      logDebug('After filtering, entriesToDisplay = ' + JSON.stringify(entriesToDisplay));
    } else {
      logDebug('No active filter, displaying all entries');
    }
    setDisplayedEntries(entriesToDisplay);
  }

  // once pipelineRange is set, update all unprocessed inputs
  useEffect(() => {
    if (pipelineRange && pipelineRange.end_ts) {
      updateAllUnprocessedInputs(pipelineRange, appConfig);
    }
  }, [pipelineRange]);

  const Tab = createStackNavigator();

  const contextVals: LabelContextProps = {
    displayedEntries,
    filterInputs,
    setFilterInputs,
  };

  return (
    <LabelTabContext.Provider value={contextVals}>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
          <Tab.Screen name="label.main" component={LabelListScreen} />
          <Tab.Screen
            name="label.details"
            component={LabelScreenDetails}
            /* When we go to the details screen, we want to keep the main screen in memory
                        so that we can go right back to it and the scroll position will be preserved.
                        This is what `detachPreviousScreen:false` does. */
            options={{ detachPreviousScreen: false }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </LabelTabContext.Provider>
  );
};

export default LabelTab;
