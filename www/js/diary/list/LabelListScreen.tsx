import React, { useContext } from "react";
import { View } from "react-native";
import { Appbar, useTheme } from "react-native-paper";
import DateSelect from "./DateSelect";
import FilterSelect from "./FilterSelect";
import TimelineScrollList from "./TimelineScrollList";
import { LabelTabContext } from "../LabelTab";

const LabelListScreen = () => {

  const { filterInputs, setFilterInputs, timelineMap, displayedEntries,
          queriedRange, loadSpecificWeek, refresh, pipelineRange,
          loadAnotherWeek, isLoading } = useContext(LabelTabContext);
  const { colors } = useTheme();

  return (<>
    <Appbar.Header statusBarHeight={0} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
      <FilterSelect filters={filterInputs}
        setFilters={setFilterInputs}
        numListDisplayed={displayedEntries?.length}
        numListTotal={timelineMap?.size} />
      <DateSelect tsRange={{ oldestTs: queriedRange?.start_ts, latestTs: queriedRange?.end_ts }}
        loadSpecificWeekFn={loadSpecificWeek} />
      <Appbar.Action icon="refresh" size={32} onPress={() => refresh()} accessibilityLabel="Refresh"
        style={{marginLeft: 'auto'}} />
    </Appbar.Header>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TimelineScrollList
        listEntries={displayedEntries}
        queriedRange={queriedRange}
        pipelineRange={pipelineRange}
        loadMoreFn={loadAnotherWeek}
        isLoading={isLoading} />
    </View>
  </>)
}

export default LabelListScreen;
