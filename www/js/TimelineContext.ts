import { createContext, useEffect, useState } from 'react';
import { CompositeTrip, TimelineEntry, TimestampRange, UserInputEntry } from './types/diaryTypes';
import useAppConfig from './useAppConfig';
import { LabelOption, LabelOptions, MultilabelKey, RichMode } from './types/labelTypes';
import { getLabelOptions, labelOptionByValue } from './survey/multilabel/confirmHelper';
import { displayError, displayErrorMsg, logDebug, logWarn } from './plugin/logger';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import {
  compositeTrips2TimelineMap,
  readAllCompositeTrips,
  readUnprocessedTrips,
  unprocessedLabels,
  unprocessedNotes,
  updateUnprocessedBleScans,
  unprocessedBleScans,
  updateAllUnprocessedInputs,
  updateLocalUnprocessedInputs,
} from './diary/timelineHelper';
import { getPipelineRangeTs } from './services/commHelper';
import { getNotDeletedCandidates, mapInputsToTimelineEntries } from './survey/inputMatcher';
import { EnketoUserInputEntry } from './survey/enketo/enketoHelper';
import { primarySectionForTrip } from './diary/diaryHelper';
import { isoDateRangeToTsRange, isoDateWithOffset } from './datetimeUtil';
import { base_modes } from 'e-mission-common';

const getTodayDate = () => DateTime.now().toISODate();
// initial date range is the past week: [TODAY - 6 days, TODAY]
const getPastWeekDateRange = (): [string, string] => {
  const todayDate = getTodayDate();
  return [isoDateWithOffset(todayDate, -6), todayDate];
};

type ContextProps = {
  labelOptions: LabelOptions | null;
  timelineMap: TimelineMap | null;
  timelineLabelMap: TimelineLabelMap | null;
  userInputFor: (tlEntry: TimelineEntry) => UserInputMap | undefined;
  notesFor: (tlEntry: TimelineEntry) => UserInputEntry[] | undefined;
  labelFor: (tlEntry: TimelineEntry, labelType: MultilabelKey) => LabelOption | undefined;
  confirmedModeFor: (tlEntry: TimelineEntry) => RichMode | undefined;
  addUserInputToEntry: (oid: string, userInput: any, inputType: 'label' | 'note') => void;
  pipelineRange: TimestampRange | null;
  queriedDateRange: [string, string] | null; // YYYY-MM-DD format
  dateRange: [string, string]; // YYYY-MM-DD format
  timelineIsLoading: string | false;
  loadMoreDays: (when: 'past' | 'future', nDays: number) => boolean | void;
  loadDateRange: (d: [string, string]) => boolean | void;
  refreshTimeline: () => void;
  shouldUpdateTimeline: Boolean;
  setShouldUpdateTimeline: React.Dispatch<React.SetStateAction<boolean>>;
};

export const useTimelineContext = (): ContextProps => {
  const { t } = useTranslation();
  const appConfig = useAppConfig();

  const [labelOptions, setLabelOptions] = useState<LabelOptions | null>(null);
  // timestamp range that has been processed by the pipeline on the server
  const [pipelineRange, setPipelineRange] = useState<TimestampRange | null>(null);
  // date range (inclusive) that has been loaded into the UI [YYYY-MM-DD, YYYY-MM-DD]
  const [queriedDateRange, setQueriedDateRange] = useState<[string, string] | null>(null);
  // date range (inclusive) chosen by datepicker [YYYY-MM-DD, YYYY-MM-DD]
  const [dateRange, setDateRange] = useState<[string, string]>(getPastWeekDateRange);
  // map of timeline entries (trips, places, untracked time), ids to objects
  const [timelineMap, setTimelineMap] = useState<TimelineMap | null>(null);
  const [timelineIsLoading, setTimelineIsLoading] = useState<string | false>('replace');
  const [timelineLabelMap, setTimelineLabelMap] = useState<TimelineLabelMap | null>(null);
  const [timelineNotesMap, setTimelineNotesMap] = useState<TimelineNotesMap | null>(null);
  const [refreshTime, setRefreshTime] = useState<Date | null>(null);
  // Leaflet map encounters an error when prerendered, so we need to render the TimelineScrollList component when the active tab is 'label'
  // 'shouldUpdateTimeline' gets updated based on the current tab index, and we can use it to determine whether to render the timeline or not
  const [shouldUpdateTimeline, setShouldUpdateTimeline] = useState(true);

  // initialization, once the appConfig is loaded
  useEffect(() => {
    try {
      if (!appConfig) return;
      getLabelOptions(appConfig).then((labelOptions) => setLabelOptions(labelOptions));
      loadTimelineEntries();
    } catch (e) {
      displayError(e, t('errors.while-initializing-label'));
    }
  }, [appConfig, refreshTime]);

  // when a new date range is chosen, load more data, then update the queriedDateRange
  useEffect(() => {
    if (!pipelineRange) {
      logDebug('No pipelineRange yet - skipping dateRange useEffect');
      return;
    }
    const onDateRangeChange = async () => {
      logDebug('Timeline: onDateRangeChange with dateRange = ' + dateRange?.join(' to '));

      // determine if this will be a new range or an expansion of the existing range
      let mode: 'replace' | 'prepend' | 'append';
      let dateRangeToQuery = dateRange;
      if (queriedDateRange?.[0] == dateRange?.[0] && queriedDateRange?.[1] == dateRange?.[1]) {
        // same range, so we are refreshing the data
        mode = 'replace';
      } else if (dateRange && queriedDateRange?.[0] == dateRange[0]) {
        // same start date, so we are loading more data into the future
        mode = 'append';
        const nextDate = isoDateWithOffset(queriedDateRange[1], 1);
        dateRangeToQuery = [nextDate, dateRange[1]];
      } else if (dateRange && queriedDateRange?.[1] == dateRange[1]) {
        // same end date, so we are loading more data into the past
        mode = 'prepend';
        const prevDate = isoDateWithOffset(queriedDateRange[0], -1);
        dateRangeToQuery = [dateRange[0], prevDate];
      } else {
        // neither start nor end date is the same, so we treat this as a completely new range
        mode = 'replace';
      }
      setTimelineIsLoading(mode);
      const [ctList, utList] = await fetchTripsInRange(dateRangeToQuery);
      handleFetchedTrips(ctList, utList, mode);
      setQueriedDateRange(dateRange);
    };

    try {
      onDateRangeChange();
    } catch (e) {
      setTimelineIsLoading(false);
      displayError(e, 'While loading date range ' + dateRange?.join(' to '));
    }
  }, [dateRange, pipelineRange]);

  useEffect(() => {
    if (!timelineMap) return;
    const allEntries = Array.from(timelineMap.values());
    const [newTimelineLabelMap, newTimelineNotesMap] = mapInputsToTimelineEntries(
      allEntries,
      appConfig,
    );
    setTimelineLabelMap(newTimelineLabelMap);
    setTimelineNotesMap(newTimelineNotesMap);
    setTimelineIsLoading(false);
  }, [timelineMap]);

  async function loadTimelineEntries() {
    try {
      const pipelineRange = await getPipelineRangeTs();
      await updateAllUnprocessedInputs(pipelineRange, appConfig);
      logDebug(`Timeline: After updating unprocessedInputs, 
        unprocessedLabels = ${JSON.stringify(unprocessedLabels)}; 
        unprocessedNotes = ${JSON.stringify(unprocessedNotes)}`);
      if (appConfig.vehicle_identities?.length) {
        await updateUnprocessedBleScans({
          start_ts: pipelineRange.end_ts,
          end_ts: Date.now() / 1000,
        });
        logDebug(`Timeline: After updating unprocessedBleScans,
          unprocessedBleScans = ${JSON.stringify(unprocessedBleScans)};
        `);
      }
      setPipelineRange(pipelineRange);
    } catch (e) {
      displayError(e, t('errors.while-loading-pipeline-range'));
      setTimelineIsLoading(false);
    }
  }

  function loadMoreDays(when: 'past' | 'future', nDays: number) {
    if (!queriedDateRange) {
      logWarn('No queriedDateRange yet - early return from loadMoreDays');
      return;
    }
    logDebug(`Timeline: loadMoreDays, ${nDays} days into the ${when}; 
      queriedDateRange = ${queriedDateRange}`);
    return loadDateRange(
      when == 'past'
        ? [isoDateWithOffset(queriedDateRange[0], -nDays), queriedDateRange[1]]
        : [queriedDateRange[0], isoDateWithOffset(queriedDateRange[1], nDays)],
    );
  }

  function loadDateRange(range: [string, string]) {
    logDebug('Timeline: loadDateRange with newDateRange = ' + range);
    if (!pipelineRange?.start_ts) {
      logWarn('No pipelineRange start_ts yet - early return from loadDateRange');
      return;
    }
    const pipelineStartDate = DateTime.fromSeconds(pipelineRange.start_ts).toISODate();
    // clamp range to ensure it is within [pipelineStartDate, TODAY_DATE]
    const clampedDateRange: [string, string] = [
      new Date(range[0]) < new Date(pipelineStartDate) ? pipelineStartDate : range[0],
      new Date(range[1]) > new Date(getTodayDate()) ? getTodayDate() : range[1],
    ];
    if (clampedDateRange[0] != dateRange?.[0] || clampedDateRange[1] != dateRange?.[1]) {
      logDebug('Timeline: loadDateRange setting new date range = ' + clampedDateRange);
      setTimelineIsLoading('queued');
      setDateRange(clampedDateRange);
      return true;
    } else {
      logDebug('Timeline: loadDateRange no change in date range');
      return false;
    }
  }

  function handleFetchedTrips(ctList, utList, mode: 'prepend' | 'append' | 'replace') {
    logDebug(`Timeline: handleFetchedTrips with
      mode = ${mode}; 
      ctList has ${ctList.length} trips; 
      utList has ${utList.length} trips`);

    const tripsRead = ctList.concat(utList);
    const showPlaces = Boolean(appConfig.survey_info?.buttons?.['place-notes']);
    const readTimelineMap = compositeTrips2TimelineMap(tripsRead, showPlaces);
    logDebug(`Timeline: after composite trips converted, 
      readTimelineMap = ${[...readTimelineMap.entries()]}`);
    if (mode == 'append') {
      setTimelineMap(new Map([...(timelineMap || []), ...readTimelineMap]));
    } else if (mode == 'prepend') {
      setTimelineMap(new Map([...readTimelineMap, ...(timelineMap || [])]));
    } else if (mode == 'replace') {
      setTimelineMap(readTimelineMap);
    } else {
      return displayErrorMsg('Unknown insertion mode ' + mode);
    }
  }

  async function fetchTripsInRange(dateRange: [string, string]) {
    logDebug('Timeline: fetchTripsInRange from ' + dateRange[0] + ' to ' + dateRange[1]);
    const [startTs, endTs] = isoDateRangeToTsRange(dateRange);

    let readCompositePromise; // comment
    if (!pipelineRange?.start_ts || !pipelineRange?.end_ts) {
      readCompositePromise = Promise.resolve([]);
    } else {
      const maxStartTs = Math.max(startTs, pipelineRange.start_ts); // ensure that we don't read before the pipeline start
      const minEndTs = Math.min(endTs, pipelineRange.end_ts); // ensure that we don't read after the pipeline end
      readCompositePromise = readAllCompositeTrips(maxStartTs, minEndTs);
    }

    let readUnprocessedPromise;
    if (pipelineRange?.end_ts && pipelineRange.end_ts > endTs) {
      readUnprocessedPromise = Promise.resolve([]);
    } else {
      let lastProcessedTrip: CompositeTrip | undefined;
      if (timelineMap) {
        lastProcessedTrip = [...timelineMap?.values()]
          .reverse()
          .find((trip) => trip.origin_key.includes('trip')) as CompositeTrip;
      }
      readUnprocessedPromise = readUnprocessedTrips(
        Math.max(pipelineRange?.end_ts || 0, startTs),
        endTs,
        appConfig,
        lastProcessedTrip,
      );
    }

    const results = await Promise.all([readCompositePromise, readUnprocessedPromise]);
    logDebug(`Timeline: readCompositePromise resolved with ${results[0]?.length} trips; 
      readUnprocessedPromise resolved with ${results[1]?.length} trips`);
    return results;
  }

  function refreshTimeline() {
    try {
      logDebug('timelineContext: refreshTimeline');
      setTimelineIsLoading('replace');
      setDateRange(getPastWeekDateRange());
      setQueriedDateRange(null);
      setTimelineMap(null);
      setRefreshTime(new Date());
    } catch (e) {
      displayError(e, t('errors.while-refreshing-label'));
    }
  }

  const userInputFor = (tlEntry: TimelineEntry) =>
    timelineLabelMap?.[tlEntry._id.$oid] || undefined;
  const notesFor = (tlEntry: TimelineEntry) => timelineNotesMap?.[tlEntry._id.$oid] || undefined;

  /**
   * @param tlEntry The trip or place object to get the label for
   * @param labelType The type of label to get (e.g. MODE, PURPOSE, etc.)
   * @returns the label option object for the given label type, or undefined if there is no label
   */
  const labelFor = (tlEntry: TimelineEntry, labelType: MultilabelKey) => {
    const chosenLabel = userInputFor(tlEntry)?.[labelType]?.data.label;
    return chosenLabel ? labelOptionByValue(chosenLabel, labelType) : undefined;
  };

  /**
   * @param tlEntry The trip or place object to get the confirmed mode for
   * @returns Rich confirmed mode, which could be a vehicle identity as determined by Bluetooth scans,
   *  or the label option from a user-given 'MODE' label, or undefined if neither exists.
   */
  const confirmedModeFor = (tlEntry: CompositeTrip) =>
    base_modes.get_rich_mode(
      primarySectionForTrip(tlEntry)?.ble_sensed_mode || labelFor(tlEntry, 'MODE'),
    ) as RichMode;

  function addUserInputToEntry(oid: string, userInput: any, inputType: 'label' | 'note') {
    const tlEntry = timelineMap?.get(oid);
    if (!pipelineRange || !tlEntry)
      return displayErrorMsg('Item with oid: ' + oid + ' not found in timeline');
    const nowTs = new Date().getTime() / 1000; // epoch seconds
    if (inputType == 'label') {
      const newLabels: UserInputMap = {};
      for (const [inputType, labelValue] of Object.entries<any>(userInput)) {
        newLabels[inputType] = { data: labelValue, metadata: { write_ts: nowTs } as any };
      }
      logDebug('Timeline: newLabels = ' + JSON.stringify(newLabels));
      const newTimelineLabelMap: TimelineLabelMap = {
        ...timelineLabelMap,
        [oid]: {
          ...timelineLabelMap?.[oid],
          ...newLabels,
        },
      };
      setTimelineLabelMap(newTimelineLabelMap);
    } else if (inputType == 'note') {
      const notesForEntry = timelineNotesMap?.[oid] || [];
      const newAddition = { data: userInput, metadata: { write_ts: nowTs } };
      notesForEntry.push(newAddition as UserInputEntry);
      const newTimelineNotesMap: TimelineNotesMap = {
        ...timelineNotesMap,
        [oid]: getNotDeletedCandidates(notesForEntry),
      };
      setTimelineNotesMap(newTimelineNotesMap);
    }
    /* We can update unprocessed inputs in the background, without blocking the completion
      of this function. That is why this is not 'await'ed */
    updateLocalUnprocessedInputs(pipelineRange, appConfig);
  }

  return {
    pipelineRange,
    queriedDateRange,
    dateRange,
    timelineMap,
    timelineIsLoading,
    timelineLabelMap,
    labelOptions,
    loadMoreDays,
    loadDateRange,
    refreshTimeline,
    userInputFor,
    labelFor,
    notesFor,
    confirmedModeFor,
    addUserInputToEntry,
    shouldUpdateTimeline,
    setShouldUpdateTimeline,
  };
};

export type UserInputMap = {
  /* If keys are 'MODE', 'PURPOSE', 'REPLACED_MODE', this is the MULTILABEL configuration.
    Values are entries that have a 'label' value in their 'data' */
  [k in MultilabelKey]?: UserInputEntry;
} & {
  /* Otherwise we are in the ENKETO configuration, and keys are names of surveys.
    Values are entries that have an 'xmlResponse' value in their 'data' */
  [k: string]: EnketoUserInputEntry | undefined;
};

export type TimelineMap = Map<string, TimelineEntry>; // Todo: update to reflect unpacked trips (origin_Key, etc)
export type TimelineLabelMap = {
  [k: string]: UserInputMap;
};
export type TimelineNotesMap = {
  [k: string]: UserInputEntry[];
};

export type LabelTabFilter = {
  key: string;
  text: string;
  filter: (trip: TimelineEntry, userInputForTrip: UserInputMap) => boolean;
  state?: boolean;
};

export default createContext<ContextProps>({} as ContextProps);
