import { createContext, useEffect, useState } from 'react';
import { CompositeTrip, TimelineEntry, TimestampRange, UserInputEntry } from './types/diaryTypes';
import useAppConfig from './useAppConfig';
import { LabelOption, LabelOptions, MultilabelKey } from './types/labelTypes';
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
  updateAllUnprocessedInputs,
  updateLocalUnprocessedInputs,
} from './diary/timelineHelper';
import { getPipelineRangeTs } from './services/commHelper';
import { getNotDeletedCandidates, mapInputsToTimelineEntries } from './survey/inputMatcher';
import { publish } from './customEventHandler';
import { EnketoUserInputEntry } from './survey/enketo/enketoHelper';

const ONE_DAY = 24 * 60 * 60; // seconds
const ONE_WEEK = ONE_DAY * 7; // seconds

type ContextProps = {
  labelOptions: LabelOptions | null;
  timelineMap: TimelineMap | null;
  timelineLabelMap: TimelineLabelMap | null;
  userInputFor: (tlEntry: TimelineEntry) => UserInputMap | undefined;
  notesFor: (tlEntry: TimelineEntry) => UserInputEntry[] | undefined;
  labelFor: (tlEntry: TimelineEntry, labelType: MultilabelKey) => LabelOption | undefined;
  addUserInputToEntry: (oid: string, userInput: any, inputType: 'label' | 'note') => void;
  queriedRange: TimestampRange | null;
  pipelineRange: TimestampRange | null;
  timelineIsLoading: string | false;
  loadAnotherWeek: (when: 'past' | 'future') => void;
  loadSpecificWeek: (d: Date) => void;
  refreshTimeline: () => void;
};

export const useTimelineContext = (): ContextProps => {
  const { t } = useTranslation();
  const appConfig = useAppConfig();

  const [labelOptions, setLabelOptions] = useState<LabelOptions | null>(null);
  // timestamp range that has been processed by the pipeline on the server
  const [pipelineRange, setPipelineRange] = useState<TimestampRange | null>(null);
  // timestamp range that has been loaded into the UI
  const [queriedRange, setQueriedRange] = useState<TimestampRange | null>(null);
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

  async function loadAnotherWeek(when: 'past' | 'future') {
    try {
      logDebug('LabelTab: loadAnotherWeek into the ' + when);
      if (!pipelineRange?.start_ts || !pipelineRange?.end_ts)
        return logWarn('No pipelineRange yet - early return');

      const reachedPipelineStart =
        queriedRange?.start_ts && queriedRange.start_ts <= pipelineRange.start_ts;
      const reachedPipelineEnd =
        queriedRange?.end_ts && queriedRange.end_ts >= pipelineRange.end_ts;

      if (!queriedRange) {
        // first time loading
        if (!timelineIsLoading) setTimelineIsLoading('replace');
        const nowTs = new Date().getTime() / 1000;
        const [ctList, utList] = await fetchTripsInRange(pipelineRange.end_ts - ONE_WEEK, nowTs);
        handleFetchedTrips(ctList, utList, 'replace');
        setQueriedRange({ start_ts: pipelineRange.end_ts - ONE_WEEK, end_ts: nowTs });
      } else if (when == 'past' && !reachedPipelineStart) {
        if (!timelineIsLoading) setTimelineIsLoading('prepend');
        const fetchStartTs = Math.max(queriedRange.start_ts - ONE_WEEK, pipelineRange.start_ts);
        const [ctList, utList] = await fetchTripsInRange(
          queriedRange.start_ts - ONE_WEEK,
          queriedRange.start_ts - 1,
        );
        handleFetchedTrips(ctList, utList, 'prepend');
        setQueriedRange({ start_ts: fetchStartTs, end_ts: queriedRange.end_ts });
      } else if (when == 'future' && !reachedPipelineEnd) {
        if (!timelineIsLoading) setTimelineIsLoading('append');
        const fetchEndTs = Math.min(queriedRange.end_ts + ONE_WEEK, pipelineRange.end_ts);
        const [ctList, utList] = await fetchTripsInRange(queriedRange.end_ts + 1, fetchEndTs);
        handleFetchedTrips(ctList, utList, 'append');
        setQueriedRange({ start_ts: queriedRange.start_ts, end_ts: fetchEndTs });
      }
    } catch (e) {
      setTimelineIsLoading(false);
      displayError(e, t('errors.while-loading-another-week', { when: when }));
    }
  }

  async function loadSpecificWeek(day: Date) {
    try {
      logDebug('LabelTab: loadSpecificWeek for day ' + day);
      if (!timelineIsLoading) setTimelineIsLoading('replace');
      const threeDaysBefore = DateTime.fromJSDate(day).minus({ days: 3 }).toSeconds();
      const threeDaysAfter = DateTime.fromJSDate(day).plus({ days: 3 }).toSeconds();
      const [ctList, utList] = await fetchTripsInRange(threeDaysBefore, threeDaysAfter);
      handleFetchedTrips(ctList, utList, 'replace');
      setQueriedRange({ start_ts: threeDaysBefore, end_ts: threeDaysAfter });
    } catch (e) {
      setTimelineIsLoading(false);
      displayError(e, t('errors.while-loading-specific-week', { day: day }));
    }
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

  async function fetchTripsInRange(startTs: number, endTs: number) {
    if (!pipelineRange?.start_ts || !pipelineRange?.end_ts)
      return logWarn('No pipelineRange yet - early return');
    logDebug('LabelTab: fetchTripsInRange from ' + startTs + ' to ' + endTs);
    const readCompositePromise = readAllCompositeTrips(startTs, endTs);
    let readUnprocessedPromise;
    if (endTs >= pipelineRange.end_ts) {
      const nowTs = new Date().getTime() / 1000;
      let lastProcessedTrip: CompositeTrip | undefined;
      if (timelineMap) {
        lastProcessedTrip = [...timelineMap?.values()]
          .reverse()
          .find((trip) => trip.origin_key.includes('trip')) as CompositeTrip;
      }
      readUnprocessedPromise = readUnprocessedTrips(pipelineRange.end_ts, nowTs, lastProcessedTrip);
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
      setQueriedRange(null);
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
    queriedRange,
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
