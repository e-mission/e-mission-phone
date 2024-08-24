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
import { TimelineEntry, isTrip } from '../types/diaryTypes';
import TimelineContext, { LabelTabFilter } from '../TimelineContext';
import { AppContext } from '../App';

type LabelContextProps = {
  displayedEntries: TimelineEntry[] | null;
  filterInputs: LabelTabFilter[] | null;
  setFilterInputs: (filters: LabelTabFilter[]) => void;
};
export const LabelTabContext = createContext<LabelContextProps>({} as LabelContextProps);

const LabelTab = () => {
  const { appConfig } = useContext(AppContext);
  const { pipelineRange, timelineMap, timelineLabelMap } = useContext(TimelineContext);

  const [filterRefreshTs, setFilterRefreshTs] = useState<number>(0); // used to force a refresh of the filters
  const [filterInputs, setFilterInputs] = useState<LabelTabFilter[] | null>(null);
  const [displayedEntries, setDisplayedEntries] = useState<TimelineEntry[] | null>(null);

  useEffect(() => {
    // if places are shown, we will skip filters and it will just be "show all"
    // https://github.com/e-mission/e-mission-docs/issues/894
    if (appConfig.survey_info?.buttons?.['place-notes']) {
      setFilterInputs([]);
    } else {
      // initalize filters
      const tripFilters =
        appConfig.survey_info?.['trip-labels'] == 'ENKETO'
          ? enketoConfiguredFilters
          : multilabelConfiguredFilters;
      const filtersWithState = tripFilters.map((f, i) => ({
        ...f,
        state: i == 0 ? true : false, // only the first filter will have state true on init
      }));
      setFilterInputs(filtersWithState);
    }
  }, [appConfig]);

  useEffect(() => {
    if (!timelineMap) return;
    const timelineEntries = Array.from(timelineMap.values());
    if (!timelineEntries?.length) return;
    timelineEntries.reverse().forEach((entry) => {
      if (isTrip(entry)) fillLocationNamesOfTrip(entry);
    });
  }, [timelineMap]);

  useEffect(() => {
    if (!timelineMap || !timelineLabelMap || !filterInputs) return;
    logDebug('Applying filters');
    const allEntries: TimelineEntry[] = Array.from(timelineMap.values());
    const activeFilter = filterInputs?.find((f) => f.state == true);
    let entriesToDisplay = allEntries;
    if (activeFilter) {
      const nowTs = new Date().getTime() / 1000;
      const entriesAfterFilter = allEntries.filter((e) => {
        // if the entry has a recently recorded user input, it is immune to filtering
        const labels = timelineLabelMap[e._id.$oid];
        const mostRecentInputTs = Object.values(labels || []).reduce((acc, label) => {
          if (label?.metadata?.write_ts && label.metadata.write_ts > acc)
            return label.metadata.write_ts;
          return acc;
        }, 0);
        const entryImmuneUntil = mostRecentInputTs + 30; // 30s after the most recent user input
        if (entryImmuneUntil > nowTs) {
          logDebug(`LabelTab filtering: entry still immune, skipping.
            Re-applying filters at ${entryImmuneUntil}`);
          setTimeout(() => setFilterRefreshTs(entryImmuneUntil), (entryImmuneUntil - nowTs) * 1000);
          return true;
        }
        // otherwise, just apply the filter
        return activeFilter?.filter(e, timelineLabelMap[e._id.$oid]);
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
      logDebug(`After filtering, displaying ${entriesToDisplay.length} 
                out of ${allEntries.length} entries`);
    } else {
      logDebug('No active filter, displaying all entries');
    }
    setDisplayedEntries(entriesToDisplay);
  }, [timelineMap, filterInputs, timelineLabelMap, filterRefreshTs]);

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
