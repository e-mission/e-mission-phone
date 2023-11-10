import { logDebug, displayErrorMsg } from '../plugin/logger';
import { DateTime } from 'luxon';
import { CompositeTrip, TimelineEntry, UserInputEntry } from '../types/diaryTypes';
import { keysForLabelInputs, unprocessedLabels, unprocessedNotes } from '../diary/timelineHelper';
import {
  LabelOption,
  MultilabelKey,
  getLabelInputDetails,
  inputType2retKey,
  labelOptionByValue,
} from './multilabel/confirmHelper';
import { TimelineLabelMap, TimelineNotesMap } from '../diary/LabelTabContext';

const EPOCH_MAXIMUM = 2 ** 31 - 1;

export const fmtTs = (ts_in_secs: number, tz: string): string | null =>
  DateTime.fromSeconds(ts_in_secs, { zone: tz }).toISO();

export const printUserInput = (ui: UserInputEntry): string => `${fmtTs(
  ui.data.start_ts,
  ui.metadata.time_zone,
)} (${ui.data.start_ts}) -> 
${fmtTs(ui.data.end_ts, ui.metadata.time_zone)} (${ui.data.end_ts}) ${ui.data.label} logged at ${
  ui.metadata.write_ts
}`;

export const validUserInputForDraftTrip = (
  trip: CompositeTrip,
  userInput: UserInputEntry,
  logsEnabled: boolean,
): boolean => {
  if (logsEnabled) {
    logDebug(`Draft trip:
            comparing user = ${fmtTs(userInput.data.start_ts, userInput.metadata.time_zone)}
            -> ${fmtTs(userInput.data.end_ts, userInput.metadata.time_zone)}
            trip = ${fmtTs(trip.start_ts, userInput.metadata.time_zone)}
            -> ${fmtTs(trip.end_ts, userInput.metadata.time_zone)}
            checks are (${userInput.data.start_ts >= trip.start_ts}
            && ${userInput.data.start_ts < trip.end_ts}
            || ${-(userInput.data.start_ts - trip.start_ts) <= 15 * 60})
            && ${userInput.data.end_ts <= trip.end_ts}
        `);
  }

  return (
    ((userInput.data.start_ts >= trip.start_ts && userInput.data.start_ts < trip.end_ts) ||
      -(userInput.data.start_ts - trip.start_ts) <= 15 * 60) &&
    userInput.data.end_ts <= trip.end_ts
  );
};

export const validUserInputForTimelineEntry = (
  tlEntry: TimelineEntry,
  nextEntry: TimelineEntry | null,
  userInput: UserInputEntry,
  logsEnabled: boolean,
): boolean => {
  if (!tlEntry.origin_key) return false;
  if (tlEntry.origin_key.includes('UNPROCESSED'))
    return validUserInputForDraftTrip(tlEntry, userInput, logsEnabled);

  /* Place-level inputs always have a key starting with 'manual/place', and
        trip-level inputs never have a key starting with 'manual/place'
       So if these don't match, we can immediately return false */
  const entryIsPlace = tlEntry.origin_key === 'analysis/confirmed_place';
  const isPlaceInput = (userInput.key || userInput.metadata.key).startsWith('manual/place');

  if (entryIsPlace !== isPlaceInput) return false;

  let entryStart = tlEntry.start_ts || tlEntry.enter_ts;
  let entryEnd = tlEntry.end_ts || tlEntry.exit_ts;

  if (!entryStart && entryEnd) {
    /* if a place has no enter time, this is the first start_place of the first composite trip object
      so we will set the start time to the start of the day of the end time for the purpose of comparison */
    entryStart = DateTime.fromSeconds(entryEnd).startOf('day').toUnixInteger();
  }

  if (!entryEnd) {
    /* if a place has no exit time, the user hasn't left there yet
        so we will set the end time as high as possible for the purpose of comparison */
    entryEnd = EPOCH_MAXIMUM;
  }

  if (logsEnabled) {
    logDebug(`Cleaned trip:
          comparing user = ${fmtTs(userInput.data.start_ts, userInput.metadata.time_zone)} 
          -> ${fmtTs(userInput.data.end_ts, userInput.metadata.time_zone)}
          trip = ${fmtTs(entryStart, userInput.metadata.time_zone)}
          -> ${fmtTs(entryStart, userInput.metadata.time_zone)}
          start checks are ${userInput.data.start_ts >= entryStart}
          && ${userInput.data.start_ts < entryEnd}
          end checks are ${userInput.data.end_ts <= entryEnd}
          || ${userInput.data.end_ts - entryEnd <= 15 * 60})
        `);
  }

  /* For this input to match, it must begin after the start of the timelineEntry (inclusive)
        but before the end of the timelineEntry (exclusive) */
  const startChecks = userInput.data.start_ts >= entryStart && userInput.data.start_ts < entryEnd;
  /* A matching user input must also finish before the end of the timelineEntry,
        or within 15 minutes. */
  let endChecks = userInput.data.end_ts <= entryEnd || userInput.data.end_ts - entryEnd <= 15 * 60;

  if (startChecks && !endChecks) {
    if (nextEntry) {
      const nextEntryEnd = nextEntry.end_ts || nextEntry.exit_ts;
      if (!nextEntryEnd) {
        // the last place will not have an exit_ts
        endChecks = true; // so we will just skip the end check
      } else {
        endChecks = userInput.data.end_ts <= nextEntryEnd;
        logDebug(
          `Second level of end checks when the next trip is defined(${userInput.data.end_ts} <= ${nextEntryEnd}) ${endChecks}`,
        );
      }
    } else {
      // next trip is not defined, last trip
      endChecks = userInput.data.end_local_dt.day == userInput.data.start_local_dt.day;
      logDebug('Second level of end checks for the last trip of the day');
      logDebug(
        `compare ${userInput.data.end_local_dt.day} with ${userInput.data.start_local_dt.day} ${endChecks}`,
      );
    }
    if (endChecks) {
      // If we have flipped the values, check to see that there is sufficient overlap
      const overlapDuration =
        Math.min(userInput.data.end_ts, entryEnd) - Math.max(userInput.data.start_ts, entryStart);
      logDebug(
        `Flipped endCheck, overlap(${overlapDuration})/trip(${tlEntry.duration} (${overlapDuration} / ${tlEntry.duration})`,
      );
      endChecks = overlapDuration / tlEntry.duration > 0.5;
    }
  }
  return startChecks && endChecks;
};

// parallels get_not_deleted_candidates() in trip_queries.py
export const getNotDeletedCandidates = (candidates: UserInputEntry[]): UserInputEntry[] => {
  console.log('getNotDeletedCandidates called with ' + candidates.length + ' candidates');

  // We want to retain all ACTIVE entries that have not been DELETED
  const allActiveList = candidates.filter((c) => !c.data.status || c.data.status == 'ACTIVE');
  const allDeletedIds = candidates
    .filter((c) => c.data.status && c.data.status == 'DELETED')
    .map((c) => c.data['match_id']);
  const notDeletedActive = allActiveList.filter((c) => !allDeletedIds.includes(c.data['match_id']));

  console.log(`Found ${allActiveList.length} active entries, ${allDeletedIds.length} deleted entries ->
                    ${notDeletedActive.length} non deleted active entries`);

  return notDeletedActive;
};

export const getUserInputForTimelineEntry = (
  entry: TimelineEntry,
  nextEntry: TimelineEntry | null,
  userInputList: UserInputEntry[],
): undefined | UserInputEntry => {
  const logsEnabled = userInputList?.length < 20;
  if (userInputList === undefined) {
    logDebug('In getUserInputForTimelineEntry, no user input, returning undefined');
    return undefined;
  }

  if (logsEnabled) console.log(`Input list = ${userInputList.map(printUserInput)}`);

  // undefined !== true, so this covers the label view case as well
  const potentialCandidates = userInputList.filter((ui) =>
    validUserInputForTimelineEntry(entry, nextEntry, ui, logsEnabled),
  );

  if (potentialCandidates.length === 0) {
    if (logsEnabled)
      logDebug('In getUserInputForTimelineEntry, no potential candidates, returning []');
    return undefined;
  }

  if (potentialCandidates.length === 1) {
    logDebug(
      `In getUserInputForTimelineEntry, one potential candidate, returning  ${printUserInput(
        potentialCandidates[0],
      )}`,
    );
    return potentialCandidates[0];
  }

  logDebug(`potentialCandidates are ${potentialCandidates.map(printUserInput)}`);

  const sortedPC = potentialCandidates.sort(
    (pc1, pc2) => pc2.metadata.write_ts - pc1.metadata.write_ts,
  );
  const mostRecentEntry = sortedPC[0];
  logDebug('Returning mostRecentEntry ' + printUserInput(mostRecentEntry));

  return mostRecentEntry;
};

// return array of matching additions for a trip or place
export const getAdditionsForTimelineEntry = (
  entry: TimelineEntry,
  nextEntry: TimelineEntry | null,
  additionsList: UserInputEntry[],
): UserInputEntry[] => {
  const logsEnabled = additionsList?.length < 20;

  if (additionsList === undefined) {
    logDebug('In getAdditionsForTimelineEntry, no addition input, returning []');
    return [];
  }

  // get additions that have not been deleted and filter out additions that do not start within the bounds of the timeline entry
  const notDeleted = getNotDeletedCandidates(additionsList);
  const matchingAdditions = notDeleted.filter((ui) =>
    validUserInputForTimelineEntry(entry, nextEntry, ui, logsEnabled),
  );

  if (logsEnabled) console.log(`Matching Addition list ${matchingAdditions.map(printUserInput)}`);

  return matchingAdditions;
};

export const getUniqueEntries = (combinedList) => {
  /* we should not get any non-ACTIVE entries here 
    since we have run filtering algorithms on both the phone and the server */
  const allDeleted = combinedList.filter((c) => c.data.status && c.data.status == 'DELETED');

  if (allDeleted.length > 0) {
    displayErrorMsg(
      'Found ' + allDeleted.length + ' non-ACTIVE addition entries while trying to dedup entries',
      JSON.stringify(allDeleted),
    );
  }

  const uniqueMap = new Map();
  combinedList.forEach((e) => {
    const existingVal = uniqueMap.get(e.data.match_id);
    /* if the existing entry and the input entry don't match and they are both active, we have an error
           let's notify the user for now */
    if (existingVal) {
      if (
        existingVal.data.start_ts != e.data.start_ts ||
        existingVal.data.end_ts != e.data.end_ts ||
        existingVal.data.write_ts != e.data.write_ts
      ) {
        displayErrorMsg(
          `Found two ACTIVE entries with the same match ID but different timestamps ${existingVal.data.match_id}`,
          `${JSON.stringify(existingVal)} vs ${JSON.stringify(e)}`,
        );
      } else {
        console.log(
          `Found two entries with match_id ${existingVal.data.match_id} but they are identical`,
        );
      }
    } else {
      uniqueMap.set(e.data.match_id, e);
    }
  });
  return Array.from(uniqueMap.values());
};

/**
 * @param allEntries the array of timeline entries to map inputs to
 * @returns an array containing: (i) an object mapping timeline entry IDs to label inputs,
 * and (ii) an object mapping timeline entry IDs to note inputs
 */
export function mapInputsToTimelineEntries(
  allEntries: TimelineEntry[],
  appConfig,
): [TimelineLabelMap, TimelineNotesMap] {
  const timelineLabelMap: TimelineLabelMap = {};
  const timelineNotesMap: TimelineNotesMap = {};

  allEntries.forEach((tlEntry, i) => {
    const nextEntry = i + 1 < allEntries.length ? allEntries[i + 1] : null;
    if (appConfig?.survey_info?.['trip-labels'] == 'ENKETO') {
      // ENKETO configuration: just look for the 'SURVEY' key in the unprocessedInputs
      const userInputForTrip = getUserInputForTimelineEntry(
        tlEntry,
        nextEntry,
        unprocessedLabels['SURVEY'],
      );
      if (userInputForTrip) {
        timelineLabelMap[tlEntry._id.$oid] = { SURVEY: userInputForTrip };
      } else {
        let processedSurveyResponse;
        for (const key of keysForLabelInputs(appConfig)) {
          if (tlEntry.user_input?.[key]) {
            processedSurveyResponse = tlEntry.user_input[key];
            break;
          }
        }
        timelineLabelMap[tlEntry._id.$oid] = { SURVEY: processedSurveyResponse };
      }
    } else {
      // MULTILABEL configuration: use the label inputs from the labelOptions to determine which
      // keys to look for in the unprocessedInputs
      const labelsForTrip: { [k: string]: LabelOption } = {};
      Object.keys(getLabelInputDetails()).forEach((label: MultilabelKey) => {
        // Check unprocessed labels first since they are more recent
        const userInputForTrip = getUserInputForTimelineEntry(
          tlEntry,
          nextEntry,
          unprocessedLabels[label],
        );
        if (userInputForTrip) {
          labelsForTrip[label] = labelOptionByValue(userInputForTrip.data.label, label);
        } else {
          const processedLabelValue = tlEntry.user_input?.[inputType2retKey(label)];
          labelsForTrip[label] = labelOptionByValue(processedLabelValue, label);
        }
      });
      if (Object.keys(labelsForTrip).length) {
        timelineLabelMap[tlEntry._id.$oid] = labelsForTrip;
      }
    }
  });

  if (
    appConfig?.survey_info?.buttons?.['trip-notes'] ||
    appConfig?.survey_info?.buttons?.['place-notes']
  ) {
    // trip-level or place-level notes are configured, so we need to match additions too
    allEntries.forEach((tlEntry, i) => {
      /* With additions/notes, we can have multiple entries for a single trip or place.
        So, we will read both the processed additions and unprocessed additions
        and merge them together, removing duplicates. */
      const nextEntry = i + 1 < allEntries.length ? allEntries[i + 1] : null;
      const unprocessedAdditions = getAdditionsForTimelineEntry(
        tlEntry,
        nextEntry,
        unprocessedNotes,
      );
      const processedAdditions = tlEntry.additions || [];

      const mergedAdditions = getUniqueEntries(
        getNotDeletedCandidates([...unprocessedAdditions, ...processedAdditions]),
      );
      if (mergedAdditions?.length) {
        timelineNotesMap[tlEntry._id.$oid] = mergedAdditions;
      }
    });
  }

  return [timelineLabelMap, timelineNotesMap];
}
