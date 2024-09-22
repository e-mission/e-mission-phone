import React, { useContext } from 'react';
import { View } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import DateSelect from './DateSelect';
import FilterSelect from './FilterSelect';
import TimelineScrollList from './TimelineScrollList';
import NavBar from '../../components/NavBar';
import TimelineContext from '../../TimelineContext';
import { LabelTabContext } from '../LabelTab';
import { DateTime } from 'luxon';
import { displayErrorMsg } from '../../plugin/logger';

const LabelListScreen = () => {
  const { filterInputs, setFilterInputs, displayedEntries } = useContext(LabelTabContext);
  const { timelineMap, loadDateRange, timelineIsLoading, refreshTimeline, shouldUpdateTimeline } =
    useContext(TimelineContext);
  const { colors } = useTheme();

  return (
    <>
      <NavBar elevated={true} isLoading={Boolean(timelineIsLoading)}>
        <FilterSelect
          filters={filterInputs}
          setFilters={setFilterInputs}
          numListDisplayed={displayedEntries?.length}
          numListTotal={timelineMap?.size}
        />
        <DateSelect
          mode="range"
          onChoose={({ startDate, endDate }) => {
            const start = DateTime.fromJSDate(startDate).toISODate();
            const end = DateTime.fromJSDate(endDate).toISODate();
            if (!start || !end) return displayErrorMsg('Invalid date');
            loadDateRange([start, end]);
          }}
        />
        <Appbar.Action
          icon="refresh"
          size={32}
          onPress={() => refreshTimeline()}
          accessibilityLabel="Refresh"
          style={{ margin: 0, marginLeft: 'auto' }}
        />
      </NavBar>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {shouldUpdateTimeline && <TimelineScrollList listEntries={displayedEntries} />}
      </View>
    </>
  );
};

export default LabelListScreen;
