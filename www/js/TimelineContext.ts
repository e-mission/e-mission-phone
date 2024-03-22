import { createContext, useCallback, useEffect, useState } from 'react';
import { CompositeTrip, TimelineEntry, TimestampRange, UserInputEntry } from './types/diaryTypes';
import useAppConfig from './useAppConfig';
import { LabelOption, LabelOptions, MultilabelKey } from './types/labelTypes';
import { getLabelOptions, labelOptionByValue } from './survey/multilabel/confirmHelper';
import { displayError, displayErrorMsg, logDebug, logWarn } from './plugin/logger';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import {
  isoDateWithOffset,
  compositeTrips2TimelineMap,
  readAllCompositeTrips,
  readUnprocessedTrips,
  unprocessedLabels,
  unprocessedNotes,
  updateAllUnprocessedInputs,
  updateLocalUnprocessedInputs,
  isoDateRangeToTsRange,
} from './diary/timelineHelper';
import { getPipelineRangeTs } from './services/commHelper';
import { getNotDeletedCandidates, mapInputsToTimelineEntries } from './survey/inputMatcher';
import { publish } from './customEventHandler';
import { EnketoUserInputEntry } from './survey/enketo/enketoHelper';

const ONE_DAY = 24 * 60 * 60; // seconds
const ONE_WEEK = ONE_DAY * 7; // seconds

// initial query range is the past 7 days, including today
const today = DateTime.now().toISODate().substring(0, 10);
const initialQueryRange: [string, string] = [isoDateWithOffset(today, -6), today];

type ContextProps = {
  labelOptions: LabelOptions | null;
  timelineMap: TimelineMap | null;
  timelineLabelMap: TimelineLabelMap | null;
  userInputFor: (tlEntry: TimelineEntry) => UserInputMap | undefined;
  notesFor: (tlEntry: TimelineEntry) => UserInputEntry[] | undefined;
  labelFor: (tlEntry: TimelineEntry, labelType: MultilabelKey) => LabelOption | undefined;
  addUserInputToEntry: (oid: string, userInput: any, inputType: 'label' | 'note') => void;
  pipelineRange: TimestampRange | null;
  queriedDateRange: [string, string] | null; // YYYY-MM-DD format
  dateRange: [string, string]; // YYYY-MM-DD format
  setDateRange: (d: [string, string]) => void;
  timelineIsLoading: string | false;
  loadAnotherWeek: (when: 'past' | 'future') => void;
  loadSpecificWeek: (d: string) => void;
  refreshTimeline: () => void;
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
  const [dateRange, setDateRange] = useState<[string, string]>(initialQueryRange);
  // map of timeline entries (trips, places, untracked time), ids to objects
  const [timelineMap, setTimelineMap] = useState<TimelineMap | null>(null);
  const [timelineIsLoading, setTimelineIsLoading] = useState<string | false>('replace');
  const [timelineLabelMap, setTimelineLabelMap] = useState<TimelineLabelMap | null>(null);
  const [timelineNotesMap, setTimelineNotesMap] = useState<TimelineNotesMap | null>(null);
  const [refreshTime, setRefreshTime] = useState<Date | null>(null);

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

  // when a new date range is chosen, load more date, then update the queriedDateRange
  useEffect(() => {
    const onDateRangeChange = async () => {
      if (!dateRange) return logDebug('No dateRange chosen, skipping onDateRangeChange');
      if (!pipelineRange) return logDebug('No pipelineRange yet, skipping onDateRangeChange');

      logDebug('Timeline: onDateRangeChange with dateRange = ' + dateRange?.join(' to '));

      // determine if this will be a new range or an expansion of the existing range
      let mode: 'replace' | 'prepend' | 'append';
      let dateRangeToQuery = dateRange;
      if (queriedDateRange?.[0] == dateRange[0] && queriedDateRange?.[1] == dateRange[1]) {
        // same range, so we are refreshing the data
        mode = 'replace';
      } else if (queriedDateRange?.[0] == dateRange[0]) {
        // same start date, so we are loading more data into the future
        mode = 'append';
        const nextDate = isoDateWithOffset(queriedDateRange[1], 1);
        dateRangeToQuery = [nextDate, dateRange[1]];
      } else if (queriedDateRange?.[1] == dateRange[1]) {
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

  // const onDateRangeChange = useCallback(async (dateRange: [string, string], pipelineRange) => {
  // }, []);

  useEffect(() => {
    if (!timelineMap) return;
    const allEntries = Array.from(timelineMap.values());
    const [newTimelineLabelMap, newTimelineNotesMap] = mapInputsToTimelineEntries(
      allEntries,
      appConfig,
    );
    setTimelineLabelMap(newTimelineLabelMap);
    setTimelineNotesMap(newTimelineNotesMap);

    publish('applyLabelTabFilters', {
      timelineMap,
      timelineLabelMap: newTimelineLabelMap,
    });
    setTimelineIsLoading(false);
  }, [timelineMap]);

  async function loadTimelineEntries() {
    try {
      const pipelineRange = await getPipelineRangeTs();
      await updateAllUnprocessedInputs(pipelineRange, appConfig);
      logDebug(`LabelTab: After updating unprocessedInputs, 
        unprocessedLabels = ${JSON.stringify(unprocessedLabels)}; 
        unprocessedNotes = ${JSON.stringify(unprocessedNotes)}`);
      setPipelineRange(pipelineRange);
    } catch (e) {
      displayError(e, t('errors.while-loading-pipeline-range'));
      setTimelineIsLoading(false);
    }
  }

  function loadAnotherWeek(when: 'past' | 'future') {
    const existingRange = queriedDateRange || initialQueryRange;
    logDebug(`Timeline: loadAnotherWeek for ${when}; 
      queriedDateRange = ${queriedDateRange}; 
      existingRange = ${existingRange}`);
    let newDateRange: [string, string];
    if (when == 'past') {
      newDateRange = [isoDateWithOffset(existingRange[0], -7), existingRange[1]];
    } else {
      newDateRange = [existingRange[0], isoDateWithOffset(existingRange[1], 7)];
    }
    logDebug('Timeline: loadAnotherWeek setting new date range = ' + newDateRange);
    setDateRange(newDateRange);
  }

  function loadSpecificWeek(date: string) {
    logDebug('Timeline: loadSpecificWeek for date ' + date);
    const threeDaysBefore = isoDateWithOffset(date, -3);
    const threeDaysAfter = isoDateWithOffset(date, 3);
    setDateRange([threeDaysBefore, threeDaysAfter]);
  }

  function handleFetchedTrips(ctList, utList, mode: 'prepend' | 'append' | 'replace') {
    logDebug(`LabelTab: handleFetchedTrips with
      mode = ${mode}; 
      ctList = ${JSON.stringify(ctList)}; 
      utList = ${JSON.stringify(utList)}`);

    const tripsRead = ctList.concat(utList);
    const showPlaces = Boolean(appConfig.survey_info?.buttons?.['place-notes']);
    const readTimelineMap = compositeTrips2TimelineMap(tripsRead, showPlaces);
    logDebug(`LabelTab: after composite trips converted, 
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
    if (!pipelineRange?.start_ts || !pipelineRange?.end_ts)
      return logWarn('No pipelineRange yet - early return');
    logDebug('LabelTab: fetchTripsInRange from ' + startTs + ' to ' + endTs);
    const readCompositePromise = readAllCompositeTrips(startTs, endTs);
    const [startTs, endTs] = isoDateRangeToTsRange(dateRange);

    const readCompositePromise = readAllCompositeTrips(
      Math.max(startTs, pipelineRange.start_ts), // ensure that we don't read before the pipeline start
      Math.min(endTs, pipelineRange.end_ts), // ensure that we don't read after the pipeline end
    );

    let readUnprocessedPromise;
    if (endTs >= pipelineRange.end_ts) {
      let lastProcessedTrip: CompositeTrip | undefined;
      if (timelineMap) {
        lastProcessedTrip = [...timelineMap?.values()]
          .reverse()
          .find((trip) => trip.origin_key.includes('trip')) as CompositeTrip;
      }
      readUnprocessedPromise = readUnprocessedTrips(pipelineRange.end_ts, endTs, lastProcessedTrip);
    } else {
      readUnprocessedPromise = Promise.resolve([]);
    }

    const results = await Promise.all([readCompositePromise, readUnprocessedPromise]);
    logDebug(`LabelTab: readCompositePromise resolved as: ${JSON.stringify(results[0])}; 
      readUnprocessedPromise resolved as: ${JSON.stringify(results[1])}`);
    return results;
  }

  function refreshTimeline() {
    try {
      logDebug('timelineContext: refreshTimeline');
      setTimelineIsLoading('replace');
      setQueriedDateRange(initialQueryRange);
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

  function addUserInputToEntry(oid: string, userInput: any, inputType: 'label' | 'note') {
    const tlEntry = timelineMap?.get(oid);
    if (!pipelineRange || !tlEntry)
      return displayErrorMsg('Item with oid: ' + oid + ' not found in timeline');
    const nowTs = new Date().getTime() / 1000; // epoch seconds
    if (inputType == 'label') {
      const newLabels = {};
      for (const [inputType, labelValue] of Object.entries(userInput)) {
        newLabels[inputType] = { data: labelValue, metadata: nowTs };
      }
      logDebug('LabelTab: newLabels = ' + JSON.stringify(newLabels));
      const newTimelineLabelMap: TimelineLabelMap = {
        ...timelineLabelMap,
        [oid]: {
          ...timelineLabelMap?.[oid],
          ...newLabels,
        },
      };
      setTimelineLabelMap(newTimelineLabelMap);
      setTimeout(
        () =>
          publish('applyLabelTabFilters', {
            timelineMap,
            timelineLabelMap: newTimelineLabelMap,
          }),
        30000,
      ); // wait 30s before reapplying filters
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
    setDateRange,
    timelineMap,
    timelineIsLoading,
    timelineLabelMap,
    labelOptions,
    loadAnotherWeek,
    loadSpecificWeek,
    refreshTimeline,
    userInputFor,
    labelFor,
    notesFor,
    addUserInputToEntry,
  };
};

export type UserInputMap = {
  /* if the key here is 'SURVEY', we are in the ENKETO configuration, meaning the user input
    value will have the raw 'xmlResponse' string */
  SURVEY?: EnketoUserInputEntry;
} & {
  /* all other keys, (e.g. 'MODE', 'PURPOSE') are from the MULTILABEL configuration
    and will have the 'label' string but no 'xmlResponse' string */
  [k in MultilabelKey]?: UserInputEntry;
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
