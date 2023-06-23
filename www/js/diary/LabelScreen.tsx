import React, { useContext } from "react";
import { object, func, array, bool, string, oneOfType } from "prop-types";
import { View, useWindowDimensions } from "react-native";
import { Appbar } from "react-native-paper";
import DateSelect from "./list/DateSelect";
import FilterSelect from "./list/FilterSelect";
import TimelineScrollList from "./list/TimelineScrollList";
import { LabelTabContext } from "./LabelTab";

const LabelScreen = () => {

  const { filterInputs, setFilterInputs, displayTrips, allTrips,
          loadedRange, loadSpecificWeekFn, refreshFn, listEntries,
          pipelineRange, loadAnotherWeekFn, isLoading } = useContext(LabelTabContext);

  return (<>
    <Appbar.Header statusBarHeight={12} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
      <FilterSelect filters={filterInputs}
        setFilters={setFilterInputs}
        numListDisplayed={displayTrips.length}
        numListTotal={allTrips.length} />
      <DateSelect tsRange={{ oldestTs: loadedRange.start_ts, latestTs: loadedRange.end_ts }}
        loadSpecificWeekFn={loadSpecificWeekFn} />
      <Appbar.Action icon="refresh" size={32} onPress={() => refreshFn()} />
    </Appbar.Header>
    <View style={{ flex: 1 }}>
      <TimelineScrollList
        listEntries={listEntries}
        loadedRange={loadedRange}
        pipelineRange={pipelineRange}
        loadMoreFn={loadAnotherWeekFn}
        isLoading={isLoading} />
    </View>
  </>)
}

export default LabelScreen;
