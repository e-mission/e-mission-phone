'use strict';

angular.module('emission.survey.inputmatcher', ['emission.plugin.logger'])
.factory('InputMatcher', function($translate, Logger){
  var im = {};

  const EPOCH_MAXIMUM = 2**31 - 1;
  const fmtTs = function(ts_in_secs, tz) {
    return moment(ts_in_secs * 1000).tz(tz).format();
  }

  var printUserInput = function(ui) {
    return fmtTs(ui.data.start_ts, ui.metadata.time_zone) + "("+ui.data.start_ts + ") -> "+
           fmtTs(ui.data.end_ts, ui.metadata.time_zone) + "("+ui.data.end_ts + ")"+
           " " + ui.data.label + " logged at "+ ui.metadata.write_ts;
  }

  im.validUserInputForDraftTrip = function(trip, userInput, logsEnabled) {
    if (logsEnabled) {
        Logger.log(`Draft trip:
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
    return (userInput.data.start_ts >= trip.start_ts
        && userInput.data.start_ts < trip.end_ts
        || -(userInput.data.start_ts - trip.start_ts) <= 15 * 60)
        && userInput.data.end_ts <= trip.end_ts;
  }

  im.validUserInputForTimelineEntry = function(tlEntry, userInput, logsEnabled) {
    if (tlEntry.key.includes('UNPROCESSED') == true)
        return im.validUserInputForDraftTrip(tlEntry, userInput, logsEnabled);

    /* Place-level inputs always have a key starting with 'manual/place', and
        trip-level inputs never have a key starting with 'manual/place'
       So if these don't match, we can immediately return false */
    const entryIsPlace = tlEntry.origin_key == 'analysis/confirmed_place';
    const isPlaceInput = (userInput.key || userInput.metadata.key).startsWith('manual/place');
    if (entryIsPlace != isPlaceInput)
        return false;

    let entryStart = tlEntry.start_ts || tlEntry.enter_ts;
    let entryEnd = tlEntry.end_ts || tlEntry.exit_ts;
    if (!entryStart && entryEnd) {
      // if a place has no enter time, this is the first start_place of the first composite trip object
      // so we will set the start time to the start of the day of the end time for the purpose of comparison
      entryStart = moment.unix(entryEnd).startOf('day').unix();
    }
    if (!entryEnd) {
        // if a place has no exit time, the user hasn't left there yet
        // so we will set the end time as high as possible for the purpose of comparison
        entryEnd = EPOCH_MAXIMUM;
    }
    
    if (logsEnabled) { 
        Logger.log(`Cleaned trip:
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
    const startChecks = userInput.data.start_ts >= entryStart &&
        userInput.data.start_ts < entryEnd;
    /* A matching user input must also finish before the end of the timelineEntry,
        or within 15 minutes. */
    var endChecks = (userInput.data.end_ts <= entryEnd ||
        (userInput.data.end_ts - entryEnd) <= 15 * 60);
    if (startChecks && !endChecks) {
        const nextEntryObj = tlEntry.getNextEntry();
        if (nextEntryObj) {
            const nextEntryEnd = nextEntryObj.end_ts || nextEntryObj.exit_ts;
            if (!nextEntryEnd) { // the last place will not have an exit_ts
                endChecks = true; // so we will just skip the end check
            } else {
                endChecks = userInput.data.end_ts <= nextEntryEnd;
                Logger.log("Second level of end checks when the next trip is defined("+userInput.data.end_ts+" <= "+ nextEntryEnd+") = "+endChecks);
            }
        } else {
            // next trip is not defined, last trip
            endChecks = (userInput.data.end_local_dt.day == userInput.data.start_local_dt.day)
            Logger.log("Second level of end checks for the last trip of the day");
            Logger.log("compare "+userInput.data.end_local_dt.day + " with " + userInput.data.start_local_dt.day + " = " + endChecks);
        }
        if (endChecks) {
            // If we have flipped the values, check to see that there
            // is sufficient overlap
            const overlapDuration = Math.min(userInput.data.end_ts, entryEnd) - Math.max(userInput.data.start_ts, entryStart)
            Logger.log("Flipped endCheck, overlap("+overlapDuration+
                ")/trip("+tlEntry.duration+") = "+ (overlapDuration / tlEntry.duration));
            endChecks = (overlapDuration/tlEntry.duration) > 0.5;
        }
    }
    return startChecks && endChecks;
  }

  // parallels get_not_deleted_candidates() in trip_queries.py
  const getNotDeletedCandidates = function(candidates) {
    console.log('getNotDeletedCandidates called with ' + candidates.length + ' candidates');
    // We want to retain all ACTIVE entries that have not been DELETED
    const allActiveList = candidates.filter(c => !c.data.status || c.data.status == 'ACTIVE');
    const allDeletedIds = candidates.filter(c => c.data.status && c.data.status == 'DELETED').map(c => c.data['match_id']);
    const notDeletedActive = allActiveList.filter(c => !allDeletedIds.includes(c.data['match_id']));
    console.log(`Found ${allActiveList.length} active entries,
                    ${allDeletedIds.length} deleted entries ->
                    ${notDeletedActive.length} non deleted active entries`);
    return notDeletedActive;
  }

  im.getUserInputForTrip = function(trip, nextTrip, userInputList) {
    const logsEnabled = userInputList.length < 20;

    if (userInputList === undefined) {
        Logger.log("In getUserInputForTrip, no user input, returning undefined");
        return undefined;
    }

    if (logsEnabled) {
        console.log("Input list = "+userInputList.map(printUserInput));
    }
    // undefined != true, so this covers the label view case as well
    var potentialCandidates = userInputList.filter((ui) => im.validUserInputForTimelineEntry(trip, ui, logsEnabled));
    if (potentialCandidates.length === 0) {
        if (logsEnabled) {
            Logger.log("In getUserInputForTripStartEnd, no potential candidates, returning []");
        }
        return undefined;
    }

    if (potentialCandidates.length === 1)  {
        Logger.log("In getUserInputForTripStartEnd, one potential candidate, returning  "+ printUserInput(potentialCandidates[0]));
        return potentialCandidates[0];
    }

    Logger.log("potentialCandidates are "+potentialCandidates.map(printUserInput));
    var sortedPC = potentialCandidates.sort(function(pc1, pc2) {
        return pc2.metadata.write_ts - pc1.metadata.write_ts;
    });
    var mostRecentEntry = sortedPC[0];
    Logger.log("Returning mostRecentEntry "+printUserInput(mostRecentEntry));
    return mostRecentEntry;
  }

  // return array of matching additions for a trip or place
  im.getAdditionsForTimelineEntry = function(entry, additionsList) {
    const logsEnabled = additionsList.length < 20;

    if (additionsList === undefined) {
      Logger.log("In getAdditionsForTimelineEntry, no addition input, returning []");
      return [];
    }

    // get additions that have not been deleted
    // and filter out additions that do not start within the bounds of the timeline entry
    const notDeleted = getNotDeletedCandidates(additionsList);
    const matchingAdditions = notDeleted.filter((ui) => im.validUserInputForTimelineEntry(entry, ui, logsEnabled));

    if (logsEnabled) {
      console.log("Matching Addition list = "+matchingAdditions.map(printUserInput));
    }
    return matchingAdditions;
  }

  im.getUniqueEntries = function(combinedList) {
    // we should not get any non-ACTIVE entries here
    // since we have run filtering algorithms on both the phone and the server
    const allDeleted = combinedList.filter(c => c.data.status && c.data.status == 'DELETED');
    if (allDeleted.length > 0) {
        Logger.displayError("Found "+allDeletedEntries.length
            +" non-ACTIVE addition entries while trying to dedup entries",
            allDeletedEntries);
    }
    const uniqueMap = new Map();
    combinedList.forEach((e) => {
        const existingVal = uniqueMap.get(e.data.match_id);
        // if the existing entry and the input entry don't match
        // and they are both active, we have an error
        // let's notify the user for now
        if (existingVal) {
            if ((existingVal.data.start_ts != e.data.start_ts) ||
                (existingVal.data.end_ts != e.data.end_ts) ||
                (existingVal.data.write_ts != e.data.write_ts)) {
                Logger.displayError("Found two ACTIVE entries with the same match ID but different timestamps "+existingVal.data.match_id,
                JSON.stringify(existingVal) + " vs. "+ JSON.stringify(e));
            } else {
                console.log("Found two entries with match_id "+existingVal.data.match_id+" but they are identical");
            }
        } else {
            uniqueMap.set(e.data.match_id, e);
        }
    });
    return Array.from(uniqueMap.values());
  }

  return im;
});
