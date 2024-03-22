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
  const { timelineMap, loadSpecificWeek, refreshTimeline, loadAnotherWeek } =
    useContext(TimelineContext);
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
          mode="single"
          onChoose={({ date }) => loadSpecificWeek(date.toISOString().substring(0, 10))}
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
        <TimelineScrollList listEntries={displayedEntries} loadMoreFn={loadAnotherWeek} />
      </View>
    </>
  );
};

export default LabelListScreen;
