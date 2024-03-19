import React, { useContext } from 'react';
import { View } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import DateSelect from './DateSelect';
import FilterSelect from './FilterSelect';
import TimelineScrollList from './TimelineScrollList';
import NavBar from '../../components/NavBar';
import TimelineContext from '../../TimelineContext';
import { LabelTabContext } from '../LabelTab';

const LabelListScreen = () => {
  const { filterInputs, setFilterInputs, displayedEntries } = useContext(LabelTabContext);
  const {
    timelineMap,
    queriedRange,
    loadSpecificWeek,
    refreshTimeline,
    pipelineRange,
    loadAnotherWeek,
    timelineIsLoading,
  } = useContext(TimelineContext);
  const { colors } = useTheme();

  return (
    <>
      <NavBar>
        <FilterSelect
          filters={filterInputs}
          setFilters={setFilterInputs}
          numListDisplayed={displayedEntries?.length}
          numListTotal={timelineMap?.size}
        />
        <DateSelect
          tsRange={{ oldestTs: queriedRange?.start_ts, latestTs: queriedRange?.end_ts }}
          loadSpecificWeekFn={loadSpecificWeek}
        />
        <Appbar.Action
          icon="refresh"
          size={32}
          onPress={() => refreshTimeline()}
          accessibilityLabel="Refresh"
          style={{ marginLeft: 'auto' }}
        />
      </NavBar>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TimelineScrollList
          listEntries={displayedEntries}
          queriedRange={queriedRange}
          pipelineRange={pipelineRange}
          loadMoreFn={loadAnotherWeek}
          isLoading={timelineIsLoading}
        />
      </View>
    </>
  );
};

export default LabelListScreen;
