/*
 * Directive to display a survey for each trip
 * Assumptions:
 * - The directive is embedded within an ion-view
 * - The controller for the ion-view has a function called
 *      'recomputeListEntries` which modifies the *list* of trips and places
 *      as necessary. An example with the label view is removing the labeled trips from
 *      the "toLabel" filter. Function can be a no-op (for example, in the diary view)
 * - The view is associated with a state which we can record in the client stats.
 * - The directive implements a `verifyTrip` function that can be invoked by
 *      other components.
 */

import angular from 'angular';

angular.module('emission.survey.enketo.trip.button',
    ['emission.stats.clientstats',
        'emission.survey.enketo.answer',
        'emission.survey.inputmatcher'])
.factory("EnketoTripButtonService", function(InputMatcher, EnketoSurveyAnswer, Logger, $timeout) {
  var etbs = {};
  console.log("Creating EnketoTripButtonService");
  etbs.key = "manual/trip_user_input";
  etbs.SINGLE_KEY="SURVEY";
  etbs.MANUAL_KEYS = [etbs.key];

  /**
   * Embed 'inputType' to the trip.
   */
   etbs.extractResult = (results) => EnketoSurveyAnswer.filterByNameAndVersion('TripConfirmSurvey', results);

   etbs.processManualInputs = function(manualResults, resultMap) {
    if (manualResults.length > 1) {
        Logger.displayError("Found "+manualResults.length+" results expected 1", manualResults);
    } else {
        console.log("ENKETO: processManualInputs with ", manualResults, " and ", resultMap);
        const surveyResult = manualResults[0];
        resultMap[etbs.SINGLE_KEY] = surveyResult;
    }
  }

  etbs.populateInputsAndInferences = function(trip, manualResultMap) {
    console.log("ENKETO: populating trip,", trip, " with result map", manualResultMap);
    if (angular.isDefined(trip)) {
        // console.log("Expectation: "+JSON.stringify(trip.expectation));
        // console.log("Inferred labels from server: "+JSON.stringify(trip.inferred_labels));
        trip.userInput = {};
        etbs.populateManualInputs(trip, trip.getNextEntry(), etbs.SINGLE_KEY,
            manualResultMap[etbs.SINGLE_KEY]);
        trip.finalInference = {};
        etbs.inferFinalLabels(trip);
        etbs.updateVerifiability(trip);
    } else {
        console.log("Trip information not yet bound, skipping fill");
    }
  }

  /**
   * Embed 'inputType' to the trip
   * This is the version that is called from the list, which focuses only on
   * manual inputs. It also sets some additional values 
   */
  etbs.populateManualInputs = function (trip, nextTrip, inputType, inputList) {
      // Check unprocessed labels first since they are more recent
      const unprocessedLabelEntry = InputMatcher.getUserInputForTrip(trip, nextTrip,
          inputList);
      var userInputEntry = unprocessedLabelEntry;
      if (!angular.isDefined(userInputEntry)) {
          userInputEntry = trip.user_input?.[etbs.inputType2retKey(inputType)];
      }
      etbs.populateInput(trip.userInput, inputType, userInputEntry);
      // Logger.log("Set "+ inputType + " " + JSON.stringify(userInputEntry) + " for trip starting at " + JSON.stringify(trip.start_fmt_time));
      etbs.editingTrip = angular.undefined;
  }

  /**
   * Insert the given userInputLabel into the given inputType's slot in inputField
   */
  etbs.populateInput = function(tripField, inputType, userInputEntry) {
    if (angular.isDefined(userInputEntry)) {
        tripField[inputType] = userInputEntry;
    }
  }

  /**
   * Given the list of possible label tuples we've been sent and what the user has already input for the trip, choose the best labels to actually present to the user.
   * The algorithm below operationalizes these principles:
   *   - Never consider label tuples that contradict a green label
   *   - Obey "conservation of uncertainty": the sum of probabilities after filtering by green labels must equal the sum of probabilities before
   *   - After filtering, predict the most likely choices at the level of individual labels, not label tuples
   *   - Never show user yellow labels that have a lower probability of being correct than confidenceThreshold
   */
  etbs.inferFinalLabels = function(trip) {
    // currently a NOP since we don't have any other trip properties
    return;
  }

  /**
   * MODE (becomes manual/mode_confirm) becomes mode_confirm
   */
  etbs.inputType2retKey = function(inputType) {
    return etbs.key.split("/")[1];
  }

  etbs.updateVerifiability = function(trip) {
    // currently a NOP since we don't have any other trip properties
    trip.verifiability = "cannot-verify";
    return;
  }

  return etbs;
});
