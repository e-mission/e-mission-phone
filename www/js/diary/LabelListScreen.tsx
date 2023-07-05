import React, { useContext } from "react";
import { View } from "react-native";
import { Appbar } from "react-native-paper";
import DateSelect from "./list/DateSelect";
import FilterSelect from "./list/FilterSelect";
import TimelineScrollList from "./list/TimelineScrollList";
import { LabelTabContext } from "./LabelTab";

const LabelListScreen = () => {

  const { filterInputs, setFilterInputs, displayTrips, allTrips,
          queriedRange, loadSpecificWeek, refresh, listEntries,
          pipelineRange, loadAnotherWeek, isLoading } = useContext(LabelTabContext);

  return (<>
    <Appbar.Header statusBarHeight={12} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
      <FilterSelect filters={filterInputs}
        setFilters={setFilterInputs}
        numListDisplayed={displayTrips.length}
        numListTotal={allTrips.length} />
      <DateSelect tsRange={{ oldestTs: queriedRange?.start_ts, latestTs: queriedRange?.end_ts }}
        loadSpecificWeekFn={loadSpecificWeek} />
      <Appbar.Action icon="refresh" size={32} onPress={() => refresh()}
        style={{marginLeft: 'auto'}} />
    </Appbar.Header>
    <View style={{ flex: 1 }}>
      <TimelineScrollList
        listEntries={listEntries}
        queriedRange={queriedRange}
        pipelineRange={pipelineRange}
        loadMoreFn={loadAnotherWeek}
        isLoading={isLoading} />
    </View>
  </>)
}

export default LabelListScreen;
