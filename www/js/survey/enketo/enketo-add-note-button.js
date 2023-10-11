/*
 * Directive to display a survey to add notes to a timeline entry (trip or place)
 */

import angular from 'angular';

angular.module('emission.survey.enketo.add-note-button',
    ['emission.services',
        'emission.survey.enketo.answer',
        'emission.survey.inputmatcher'])
.factory("EnketoNotesButtonService", function(InputMatcher, EnketoSurveyAnswer, Logger, $timeout) {
  var enbs = {};
  console.log("Creating EnketoNotesButtonService");
  enbs.SINGLE_KEY="NOTES";
  enbs.MANUAL_KEYS = [];

  /**
   * Set the keys for trip and/or place additions whichever will be enabled,
   * and sets the name of the surveys they will use.
   */
  enbs.initConfig = function(tripSurveyName, placeSurveyName) {
    enbs.tripSurveyName = tripSurveyName;
    if (tripSurveyName) {
       enbs.MANUAL_KEYS.push("manual/trip_addition_input")
    }
    enbs.placeSurveyName = placeSurveyName;
    if (placeSurveyName) {
       enbs.MANUAL_KEYS.push("manual/place_addition_input")
    }
  }

  /**
   * Embed 'inputType' to the timelineEntry.
   */
  enbs.extractResult = function(results) {
    const resultsPromises = [EnketoSurveyAnswer.filterByNameAndVersion(enbs.timelineEntrySurveyName, results)];
    if (enbs.timelineEntrySurveyName != enbs.placeSurveyName) {
      resultsPromises.push(EnketoSurveyAnswer.filterByNameAndVersion(enbs.placeSurveyName, results));
    }
    return Promise.all(resultsPromises);
  };

  enbs.processManualInputs = function(manualResults, resultMap) {
    console.log("ENKETO: processManualInputs with ", manualResults, " and ", resultMap);
    const surveyResults = manualResults.flat(2);
    resultMap[enbs.SINGLE_KEY] = surveyResults;
  }

  enbs.populateInputsAndInferences = function(timelineEntry, manualResultMap) {
    console.log("ENKETO: populating timelineEntry,", timelineEntry, " with result map", manualResultMap);
    if (angular.isDefined(timelineEntry)) {
        // initialize additions array as empty if it doesn't already exist
        timelineEntry.additionsList ||= [];
        enbs.populateManualInputs(timelineEntry, enbs.SINGLE_KEY, manualResultMap[enbs.SINGLE_KEY]);
    } else {
        console.log("timelineEntry information not yet bound, skipping fill");
    }
  }

  /**
   * Embed 'inputType' to the timelineEntry
   * This is the version that is called from the list, which focuses only on
   * manual inputs. It also sets some additional values 
   */
  enbs.populateManualInputs = function (timelineEntry, inputType, inputList) {
      // there is not necessarily just one addition per timeline entry,
      // so unlike user inputs, we don't want to replace the server entry with
      // the unprocessed entry
      // but we also don't want to blindly append the unprocessed entry; what
      // if it was a deletion.
      // what we really want to do is to merge the unprocessed and processed entries
      // taking deletion into account
      // one option for that is to just combine the processed and unprocessed entries
      // into a single list
      // note that this is not necessarily the most performant approach, since we will
      // be re-matching entries that have already been matched on the server
      // but the number of matched entries is likely to be small, so we can live
      // with the performance for now
      const unprocessedAdditions = InputMatcher.getAdditionsForTimelineEntry(timelineEntry, inputList);
      const combinedPotentialAdditionList = timelineEntry.additions.concat(unprocessedAdditions);
      const dedupedList = InputMatcher.getUniqueEntries(combinedPotentialAdditionList);
      Logger.log("After combining unprocessed ("+unprocessedAdditions.length+
        ") with server ("+timelineEntry.additions.length+
        ") for a combined ("+combinedPotentialAdditionList.length+
        "), deduped entries are ("+dedupedList.length+")");

      enbs.populateInput(timelineEntry.additionsList, inputType, dedupedList);
      // Logger.log("Set "+ inputType + " " + JSON.stringify(userInputEntry) + " for trip starting at " + JSON.stringify(trip.start_fmt_time));
      enbs.editingTrip = angular.undefined;
  }

  /**
   * Insert the given userInputLabel into the given inputType's slot in inputField
   */
  enbs.populateInput = function(timelineEntryField, inputType, userInputEntry) {
    if (angular.isDefined(userInputEntry)) {
      timelineEntryField.length = 0;
          userInputEntry.forEach(ta => {
            timelineEntryField.push(ta);
          });
    }
  }

  return enbs;
});
