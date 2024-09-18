import { useContext, useMemo } from 'react';
import { useImperialConfig } from '../config/useImperialConfig';
import {
  getFormattedSectionProperties,
  getLocalTimeString,
  getDetectedModes,
  primarySectionForTrip,
} from './diaryHelper';
import TimelineContext from '../TimelineContext';
import { formatIsoNoYear, formatIsoWeekday, humanizeIsoRange, isoDatesDifference } from '../util';

const useDerivedProperties = (tlEntry) => {
  const imperialConfig = useImperialConfig();
  const { confirmedModeFor } = useContext(TimelineContext);

  return useMemo(() => {
    const beginFmt = tlEntry.start_fmt_time || tlEntry.enter_fmt_time;
    const endFmt = tlEntry.end_fmt_time || tlEntry.exit_fmt_time;
    const beginDt = tlEntry.start_local_dt || tlEntry.enter_local_dt;
    const endDt = tlEntry.end_local_dt || tlEntry.exit_local_dt;
    const tlEntryIsMultiDay = isoDatesDifference(beginFmt, endFmt);

    return {
      confirmedMode: confirmedModeFor(tlEntry),
      primary_ble_sensed_mode: primarySectionForTrip(tlEntry)?.ble_sensed_mode?.baseMode,
      displayDate: formatIsoWeekday(beginFmt, endFmt),
      displayStartTime: getLocalTimeString(beginDt),
      displayEndTime: getLocalTimeString(endDt),
      displayTime: humanizeIsoRange(beginFmt, endFmt),
      displayStartDateAbbr: tlEntryIsMultiDay ? formatIsoNoYear(beginFmt) : null,
      displayEndDateAbbr: tlEntryIsMultiDay ? formatIsoNoYear(endFmt) : null,
      formattedDistance: imperialConfig.getFormattedDistance(tlEntry.distance),
      formattedSectionProperties: getFormattedSectionProperties(tlEntry, imperialConfig),
      distanceSuffix: imperialConfig.distanceSuffix,
      detectedModes: getDetectedModes(tlEntry),
    };
  }, [tlEntry, imperialConfig, confirmedModeFor(tlEntry)]);
};

export default useDerivedProperties;
