import { useMemo } from "react";
import { useImperialConfig } from "../config/useImperialConfig";
import { getFormattedDate, getFormattedDateAbbr, getFormattedSectionProperties, getFormattedTimeRange, getLocalTimeString, getPercentages, isMultiDay } from "./diaryHelper";

const useDerivedProperties = (tlEntry) => {

  const imperialConfig = useImperialConfig();

  return useMemo(() => {
    const beginFmt = tlEntry.start_fmt_time || tlEntry.enter_fmt_time;
    const endFmt = tlEntry.end_fmt_time || tlEntry.exit_fmt_time;
    const beginDt = tlEntry.start_local_dt || tlEntry.enter_local_dt;
    const endDt = tlEntry.end_local_dt || tlEntry.exit_local_dt;
    const tlEntryIsMultiDay = isMultiDay(beginFmt, endFmt);
    
    return {
      displayDate: getFormattedDate(beginFmt, endFmt),
      displayStartTime: getLocalTimeString(beginDt),
      displayEndTime: getLocalTimeString(endDt),
      displayTime: getFormattedTimeRange(beginFmt, endFmt),
      displayStartDateAbbr: tlEntryIsMultiDay ? getFormattedDateAbbr(beginFmt) : null,
      displayEndDateAbbr: tlEntryIsMultiDay ? getFormattedDateAbbr(endFmt) : null,
      formattedDistance: imperialConfig.getFormattedDistance(tlEntry.distance),
      formattedSectionProperties: getFormattedSectionProperties(tlEntry, imperialConfig),
      distanceSuffix: imperialConfig.distanceSuffix,
      percentages: getPercentages(tlEntry),
    }
  }, [tlEntry, imperialConfig]);
}

export default useDerivedProperties;
