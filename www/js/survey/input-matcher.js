'use strict';

angular.module('emission.survey.inputmatcher', ['emission.plugin.logger'])
.factory('InputMatcher', function($translate){
  var im = {};
  var fmtTs = function(ts_in_secs, tz) {
    return moment(ts_in_secs * 1000).tz(tz).format();
  }

  var printUserInput = function(ui) {
    return fmtTs(ui.data.start_ts, ui.metadata.time_zone) + "("+ui.data.start_ts + ") -> "+
           fmtTs(ui.data.end_ts, ui.metadata.time_zone) + "("+ui.data.end_ts + ")"+
           " " + ui.data.label + " logged at "+ ui.metadata.write_ts;
  }

  im.validUserInputForTimelineEntry = function(tlEntry, userInput, logsEnabled) {
    /*
    console.log("startDelta "+userInput.data.label+
        "= user("+fmtTs(userInput.data.start_ts, userInput.metadata.time_zone)+
        ") - trip("+fmtTs(userInput.data.start_ts, userInput.metadata.time_zone)+") = "+
        (userInput.data.start_ts - trip.start_ts)+" should be positive");
    console.log("endDelta = "+userInput.data.label+
        "user("+fmtTs(userInput.data.end_ts, userInput.metadata.time_zone)+
        ") - trip("+fmtTs(trip.end_ts, userInput.metadata.time_zone)+") = "+
        (userInput.data.end_ts - trip.end_ts)+" should be negative");
    */
    // logic described in
    // https://github.com/e-mission/e-mission-docs/issues/423
    const entryStart = tlEntry.start_ts || tlEntry.enter_ts;
    const entryEnd = tlEntry.end_ts || tlEntry.exit_ts;
    if (tlEntry.isDraft == true) {
        if (logsEnabled) {
            var logStr = "Draft trip: comparing user = "+fmtTs(userInput.data.start_ts, userInput.metadata.time_zone)
                +" -> "+fmtTs(userInput.data.end_ts, userInput.metadata.time_zone)
                +" trip = "+fmtTs(entryStart, userInput.metadata.time_zone)
                +" -> "+fmtTs(entryEnd, userInput.metadata.time_zone)
                +" checks are ("+(userInput.data.start_ts >= entryStart)
                +" && "+(userInput.data.start_ts < entryEnd)
                +" || "+(-(userInput.data.start_ts - entryStart) <= 15 * 60)
                +") && "+(userInput.data.end_ts <= entryEnd);
            console.log(logStr);
            // Logger.log(logStr);
        }
        return (userInput.data.start_ts >= entryStart
            && userInput.data.start_ts < entryEnd
            || -(userInput.data.start_ts - entryStart) <= 15 * 60)
            && userInput.data.end_ts <= entryEnd;
    } else {
        // we know that the trip is cleaned so we can use the fmt_time
        // but the confirm objects are not necessarily filled out
        if (logsEnabled) {
            var logStr = "Cleaned trip: comparing user = "
                +fmtTs(userInput.data.start_ts, userInput.metadata.time_zone)
                +" -> "+fmtTs(userInput.data.end_ts, userInput.metadata.time_zone)
                +" trip = "+fmtTs(entryStart, userInput.metadata.time_zone)
                +" -> "+fmtTs(entryStart, userInput.metadata.time_zone)
                +" start checks are "+(userInput.data.start_ts >= entryStart)
                +" && "+(userInput.data.start_ts < entryEnd)
                +" end checks are "+(userInput.data.end_ts <= entryEnd)
                +" || "+((userInput.data.end_ts - entryEnd) <= 15 * 60)+")";
            Logger.log(logStr);
        }
        // https://github.com/e-mission/e-mission-docs/issues/476#issuecomment-747222181
        const startChecks = userInput.data.start_ts >= entryStart &&
            userInput.data.start_ts < entryEnd;
        var endChecks = (userInput.data.end_ts <= entryEnd ||
            (userInput.data.end_ts - entryEnd) <= 15 * 60);
        if (startChecks && !endChecks) {
            if (tlEntry.nextEntry) {
                endChecks = userInput.data.end_ts <= tlEntry.nextEntry.start_ts;
                Logger.log("Second level of end checks when the next trip is defined("+userInput.data.end_ts+" <= "+ tlEntry.nextEntry.start_ts+") = "+endChecks);
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
        Logger.log("In getUserInputForTrip, no user input, returning []");
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
      return undefined;
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

  return im;
});
