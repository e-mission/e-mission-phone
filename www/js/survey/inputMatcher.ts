import { logDebug, displayErrorMsg } from '../plugin/logger';
import { DateTime } from 'luxon';
import {
  BluetoothBleData,
  CompositeTrip,
  ConfirmedPlace,
  TimelineEntry,
  UserInputEntry,
} from '../types/diaryTypes';
import {
  keysForLabelInputs,
  unprocessedBleScans,
  unprocessedLabels,
  unprocessedNotes,
} from '../diary/timelineHelper';
import {
  getLabelInputDetails,
  inputType2retKey,
  removeManualPrefix,
} from './multilabel/confirmHelper';
import { TimelineLabelMap, TimelineNotesMap, UserInputMap } from '../TimelineContext';
import { MultilabelKey } from '../types/labelTypes';
import { EnketoUserInputEntry } from './enketo/enketoHelper';
import { AppConfig } from '../types/appConfigTypes';
import { BEMData } from '../types/serverData';

const EPOCH_MAXIMUM = 2 ** 31 - 1;

export const fmtTs = (ts_in_secs: number, tz: string): false | string | null =>
  ts_in_secs && tz ? DateTime.fromSeconds(ts_in_secs, { zone: tz }).toISO() : null;

export const printUserInput = (ui: UserInputEntry): string =>
  `${fmtTs(ui.data.start_ts, ui.metadata.time_zone)} (${ui.data.start_ts}) -> 
  ${fmtTs(ui.data.end_ts, ui.metadata.time_zone)} (${ui.data.end_ts}), 
  ${ui.data.label}, logged at ${ui.metadata.write_ts}`;

export function validUserInputForDraftTrip(
  trip: CompositeTrip,
  userInput: UserInputEntry,
  logsEnabled: boolean,
): boolean {
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
}

export function validUserInputForTimelineEntry(
  tlEntry: TimelineEntry,
  nextEntry: TimelineEntry | null,
  userInput: UserInputEntry,
  logsEnabled: boolean,
): boolean {
  if (!tlEntry.origin_key) return false;
  if (tlEntry.origin_key.includes('UNPROCESSED'))
    return validUserInputForDraftTrip(tlEntry as CompositeTrip, userInput, logsEnabled);

  /* Place-level inputs always have a key starting with 'manual/place', and
        trip-level inputs never have a key starting with 'manual/place'
       So if these don't match, we can immediately return false */
  const entryIsPlace = tlEntry.origin_key === 'analysis/confirmed_place';
  const isPlaceInput = (userInput.key || userInput.metadata.key).startsWith('manual/place');

  if (entryIsPlace !== isPlaceInput) return false;

  let entryStart = (tlEntry as CompositeTrip).start_ts || (tlEntry as ConfirmedPlace).enter_ts;
  let entryEnd = (tlEntry as CompositeTrip).end_ts || (tlEntry as ConfirmedPlace).exit_ts;

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
      const nextEntryEnd =
        (nextEntry as CompositeTrip).end_ts || (nextEntry as ConfirmedPlace).exit_ts;
      if (!nextEntryEnd) {
        // the last place will not have an exit_ts
        endChecks = true; // so we will just skip the end check
      } else {
        endChecks = userInput.data.end_ts <= nextEntryEnd;
        logDebug(`Second level of end checks when the next trip is defined, 
          (${userInput.data.end_ts} <= ${nextEntryEnd}), 
          endChecks = ${endChecks}`);
      }
    } else {
      // next trip is not defined, last trip
      endChecks = userInput.data.end_local_dt?.day == userInput.data.start_local_dt?.day;
      logDebug('Second level of end checks for the last trip of the day');
      logDebug(`compare ${userInput.data.end_local_dt?.day} with ${userInput.data.start_local_dt?.day}; 
        endChecks = ${endChecks}`);
    }
    if (endChecks) {
      // If we have flipped the values, check to see that there is sufficient overlap
      const overlapDuration =
        Math.min(userInput.data.end_ts, entryEnd) - Math.max(userInput.data.start_ts, entryStart);
      logDebug(`Flipped endCheck, overlapDuration / tlEntry.duration is 
        ${overlapDuration} / ${tlEntry.duration} = ${overlapDuration / tlEntry.duration}`);
      endChecks = overlapDuration / tlEntry.duration > 0.5;
    }
  }
  return startChecks && endChecks;
}

// parallels get_not_deleted_candidates() in trip_queries.py
export function getNotDeletedCandidates(candidates: UserInputEntry[]): UserInputEntry[] {
  logDebug('getNotDeletedCandidates called with ' + candidates.length + ' candidates');

  // We want to retain all ACTIVE entries that have not been DELETED
  const allActiveList = candidates.filter((c) => !c.data.status || c.data.status == 'ACTIVE');
  const allDeletedIds = candidates
    .filter((c) => c.data.status && c.data.status == 'DELETED')
    .map((c) => c.data['match_id']);
  const notDeletedActive = allActiveList.filter((c) => !allDeletedIds.includes(c.data['match_id']));

  logDebug(`Found ${allActiveList.length} active entries; 
    ${allDeletedIds.length} deleted entries -> 
    ${notDeletedActive.length} non-deleted active entries`);

  return notDeletedActive;
}

export function getUserInputForTimelineEntry(
  entry: TimelineEntry,
  nextEntry: TimelineEntry | null,
  userInputList: UserInputEntry[],
): undefined | UserInputEntry {
  const logsEnabled = userInputList?.length < 20;
  if (!userInputList?.length) {
    logDebug('In getUserInputForTimelineEntry, no user input, returning undefined');
    return undefined;
  }

  if (logsEnabled) logDebug(`Input list = ${userInputList.map(printUserInput)}`);

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
    logDebug(`In getUserInputForTimelineEntry, one potential candidate, 
      returning ${printUserInput(potentialCandidates[0])}`);
    return potentialCandidates[0];
  }

  logDebug(`potentialCandidates are ${potentialCandidates.map(printUserInput)}`);

  const sortedPC = potentialCandidates.sort(
    (pc1, pc2) => pc2.metadata.write_ts - pc1.metadata.write_ts,
  );
  const mostRecentEntry = sortedPC[0];
  logDebug('Returning mostRecentEntry ' + printUserInput(mostRecentEntry));

  return mostRecentEntry;
}

// return array of matching additions for a trip or place
export function getAdditionsForTimelineEntry(
  entry: TimelineEntry,
  nextEntry: TimelineEntry | null,
  additionsList: EnketoUserInputEntry[],
): UserInputEntry[] {
  const logsEnabled = additionsList?.length < 20;

  if (additionsList === undefined) {
    logDebug('In getAdditionsForTimelineEntry, no addition input, returning []');
    return [];
  }

  // filter out additions that do not start within the bounds of the timeline entry
  const matchingAdditions = additionsList.filter((ui) =>
    validUserInputForTimelineEntry(entry, nextEntry, ui, logsEnabled),
  );

  if (logsEnabled) logDebug(`Matching Addition list ${matchingAdditions.map(printUserInput)}`);

  return matchingAdditions;
}

export function getUniqueEntries(combinedList) {
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
        logDebug(`Found two entries with match_id ${existingVal.data.match_id}, 
          but they are identical`);
      }
    } else {
      uniqueMap.set(e.data.match_id, e);
    }
  });
  return Array.from(uniqueMap.values());
}

/**
 * @param allEntries the array of timeline entries to map inputs to
 * @returns an array containing: (i) an object mapping timeline entry IDs to label inputs,
 * and (ii) an object mapping timeline entry IDs to note inputs
 */
export function mapInputsToTimelineEntries(
  allEntries: TimelineEntry[],
  appConfig: AppConfig,
): [TimelineLabelMap, TimelineNotesMap] {
  const timelineLabelMap: TimelineLabelMap = {};
  const timelineNotesMap: TimelineNotesMap = {};

  allEntries.forEach((tlEntry, i) => {
    const nextEntry = i + 1 < allEntries.length ? allEntries[i + 1] : null;
    if (appConfig?.survey_info?.['trip-labels'] == 'ENKETO') {
      // ENKETO configuration: consider reponses from all surveys in unprocessedLabels
      const userInputForTrip = getUserInputForTimelineEntry(
        tlEntry,
        nextEntry,
        Object.values(unprocessedLabels).flat(1),
      ) as EnketoUserInputEntry;
      if (userInputForTrip) {
        timelineLabelMap[tlEntry._id.$oid] = { [userInputForTrip.data.name]: userInputForTrip };
      } else {
        let processedSurveyResponse: EnketoUserInputEntry | undefined;
        for (const dataKey of keysForLabelInputs(appConfig)) {
          const key = removeManualPrefix(dataKey);
          if (tlEntry.user_input?.[key]) {
            processedSurveyResponse = tlEntry.user_input[key];
            break;
          }
        }
        if (processedSurveyResponse) {
          timelineLabelMap[tlEntry._id.$oid] = {
            [processedSurveyResponse.data.name]: processedSurveyResponse,
          };
        }
      }
    } else {
      // MULTILABEL configuration: use the label inputs from the labelOptions to determine which
      // keys to look for in the unprocessedInputs
      const labelsForTrip: UserInputMap = {};
      Object.keys(getLabelInputDetails(appConfig)).forEach((label: MultilabelKey) => {
        // Check unprocessed labels first since they are more recent
        const userInputForTrip = getUserInputForTimelineEntry(
          tlEntry,
          nextEntry,
          unprocessedLabels[label],
        ) as UserInputEntry;
        if (userInputForTrip) {
          labelsForTrip[label] = userInputForTrip;
        } else {
          const processedLabelValue = tlEntry.user_input?.[inputType2retKey(label)];
          if (processedLabelValue) {
            // TODO: when we unify the user input types on the server, we can remove this 'any' cast
            labelsForTrip[label] = { data: { label: processedLabelValue } } as any;
          }
        }
      });
      if (Object.keys(labelsForTrip).length) {
        timelineLabelMap[tlEntry._id.$oid] = labelsForTrip;
      }
    }

    if (
      appConfig?.survey_info?.buttons?.['trip-notes'] ||
      appConfig?.survey_info?.buttons?.['place-notes']
    ) {
      // trip-level or place-level notes are configured, so we need to match additions too
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
    }
  });

  return [timelineLabelMap, timelineNotesMap];
}

function validBleScanForTimelineEntry(tlEntry: TimelineEntry, bleScan: BEMData<BluetoothBleData>) {
  let entryStart = (tlEntry as CompositeTrip).start_ts || (tlEntry as ConfirmedPlace).enter_ts;
  let entryEnd = (tlEntry as CompositeTrip).end_ts || (tlEntry as ConfirmedPlace).exit_ts;

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

  return bleScan.data.ts >= entryStart && bleScan.data.ts <= entryEnd;
}

/**
 * @description Get BLE scans that are of type RANGE_UPDATE and are within the time range of the timeline entry
 */
function getBleRangingScansForTimelineEntry(
  tlEntry: TimelineEntry,
  bleScans: BEMData<BluetoothBleData>[],
) {
  return bleScans.filter(
    (scan) =>
      /* RANGE_UPDATE is the string value, but the server uses an enum, so once processed it becomes 2 */
      (scan.data.eventType == 'RANGE_UPDATE' || scan.data.eventType == 2) &&
      validBleScanForTimelineEntry(tlEntry, scan),
  );
}

/**
 * @description Convert a decimal number to a hexadecimal string, with optional padding
 * @example decimalToHex(245) => 'f5'
 * @example decimalToHex(245, 4) => '00f5'
 */
function decimalToHex(d: string | number, padding?: number) {
  let hex = Number(d).toString(16);
  while (hex.length < (padding || 0)) {
    hex = '0' + hex;
  }
  return hex;
}

export function mapBleScansToTimelineEntries(allEntries: TimelineEntry[], appConfig: AppConfig) {
  const timelineBleMap = {};
  for (const tlEntry of allEntries) {
    const rangingScans = getBleRangingScansForTimelineEntry(tlEntry, unprocessedBleScans);
    if (!rangingScans.length) {
      continue;
    }

    // count the number of occurrences of each major:minor pair
    const majorMinorCounts = {};
    rangingScans.forEach((scan) => {
      const major = decimalToHex(scan.data.major, 4);
      const minor = decimalToHex(scan.data.minor, 4);
      const majorMinor = major + ':' + minor;
      majorMinorCounts[majorMinor] = majorMinorCounts[majorMinor]
        ? majorMinorCounts[majorMinor] + 1
        : 1;
    });
    // determine the major:minor pair with the highest count
    const match = Object.keys(majorMinorCounts).reduce((a, b) =>
      majorMinorCounts[a] > majorMinorCounts[b] ? a : b,
    );
    // find the vehicle identity that uses this major:minor pair
    const vehicleIdentity = appConfig.vehicle_identities?.find((vi) =>
      vi.bluetooth_major_minor.includes(match),
    );
    if (vehicleIdentity) {
      timelineBleMap[tlEntry._id.$oid] = vehicleIdentity;
    } else {
      displayErrorMsg(`No vehicle identity found for major:minor pair ${match}`);
    }
  }
  return timelineBleMap;
}
