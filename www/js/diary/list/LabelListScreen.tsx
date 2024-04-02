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
  const { timelineMap, loadSpecificWeek, timelineIsLoading, refreshTimeline } =
    useContext(TimelineContext);
  const { colors } = useTheme();

  return (
    <>
      <NavBar isLoading={Boolean(timelineIsLoading)}>
        <FilterSelect
          filters={filterInputs}
          setFilters={setFilterInputs}
          numListDisplayed={displayedEntries?.length}
          numListTotal={timelineMap?.size}
        />
        <DateSelect
          mode="single"
          onChoose={({ date }) => {
            const d = DateTime.fromJSDate(date).toISODate();
            if (!d) return displayErrorMsg('Invalid date');
            loadSpecificWeek(d);
          }}
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
        <TimelineScrollList listEntries={displayedEntries} />
      </View>
    </>
  );
};

export default LabelListScreen;
