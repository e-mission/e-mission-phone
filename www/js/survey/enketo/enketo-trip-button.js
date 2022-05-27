/*
 * Directive to display a survey for each trip
 * Assumptions:
 * - The directive is embedded within an ion-view
 * - The controller for the ion-view has a function called
 *      'recomputeDisplayTrips` which modifies the trip *list* as necessary. An
 *      example with the label view is removing the labeled trips from the
 *      "toLabel" filter. Function can be a no-op (for example, in
 *      the diary view)
 * - The view is associated with a state which we can record in the client stats.
 * - The directive implements a `verifyTrip` function that can be invoked by
 *      other components.
 */

angular.module('emission.survey.enketo.trip.button',
    ['emission.stats.clientstats',
        'emission.survey.enketo.launch',
        'emission.survey.enketo.answer',
        'emission.survey.inputmatcher'])
.directive('enketoTripButton', function() {
  return {
    scope: {
        trip: "=",
        recomputedelay: "@",
    },
    controller: "EnketoTripButtonCtrl",
    templateUrl: 'templates/survey/enketo/summary-trip-button.html'
  };
})
.controller("EnketoTripButtonCtrl", function($scope, $element, $attrs,
    EnketoSurveyLaunch, $ionicPopover, $window, ClientStats,
    EnketoTripButtonService) {
  console.log("Invoked enketo directive controller for labels "+EnketoTripButtonService.SINGLE_KEY);

  var findViewElement = function() {
      // console.log("$element is ", $element);
      // console.log("parent row is", $element.parents("ion-item"));
      let rowElement = $element.parents("ion-view")
      // console.log("row Element is", rowElement);
      return angular.element(rowElement);
  }

  var findViewState = function() {
      let viewState = findViewElement().attr("state")
      // console.log("view state is ", viewState);
      return viewState;
  }

  var findViewScope = function() {
      let viewScope = findViewElement().scope();
      // console.log("view scope is ", viewScope);
      return viewScope;
  }

  /**
   * BEGIN: Required external interface for all label directives
   * These methods will be invoked by the verifycheck directive
   * For more details on cooperating directives in this situation, please see:
   * e-mission/e-mission-docs#674 (comment)
   * to
   * e-mission/e-mission-docs#674 (comment)
   *
   * Input: none
   * Side effect: verifies the trip (partially if needed) and updates the trip
   * verifiability status.
   */

    /**
     * verifyTrip turns all of a given trip's yellow labels green
     */
    $scope.verifyTrip = function() {
      console.log("About to verify trip "+$scope.trip.start_ts
        +" -> "+$scope.trip.end_ts+" with current visibility"
        + $scope.trip.verifiability);
      // Return early since we don't want to support trip verification yet
      return;
      if ($scope.trip.verifiability != "can-verify") {
        ClientStats.addReading(ClientStats.getStatKeys().VERIFY_TRIP,
            {"verifiable": false, "currView": $scope.currentViewState});
        return;
      }
      ClientStats.addReading(ClientStats.getStatKeys().VERIFY_TRIP,
            {"verifiable": true,
             "currView": $scope.currentViewState,
             "userInput": angular.toJson($scope.trip.userInput),
             "finalInference": angular.toJson($scope.trip.finalInference)});

      $scope.draftInput = {
        "start_ts": $scope.trip.start_ts,
        "end_ts": $scope.trip.end_ts
      };
      $scope.editingTrip = $scope.trip;

      const inferred = $scope.trip.finalInference[EnketoTripButtonService.SINGLE_KEY];
      // TODO: figure out what to do with "other". For now, do not verify.
      if (inferred && !$scope.trip.userInput[EnketoTripButtonService.SINGLE_KEY] && inferred != "other") $scope.store(inputType, inferred, false);
    }

  /*
   * END: Required external interface for all label directives
   */

  if ($scope.recomputedelay == "") {
    let THIRTY_SECS = 30 * 1000;
    $scope.recomputedelay = THIRTY_SECS;
  } else {
    $scope.recomputedelay = $scope.recomputedelay * 1000;
  }

  EnketoTripButtonService.setRecomputeDelay($scope.recomputedelay);

  $scope.openPopover = function ($event, trip, inputType) {
    return EnketoSurveyLaunch
      .launch($scope, 'TripConfirmSurvey', { trip: trip })
      .then(result => {
        if (!result) {
          return;
        }
        $scope.$apply(() => trip.userInput[EnketoTripButtonService.SINGLE_KEY] = {
            data: result,
            write_ts: Date.now()
        });
        // store is commented out since the enketo survey launch currently
        // stores the value as well
        // $scope.store(inputType, result, false);
      });
  };


  $scope.store = function (inputType, input, isOther) {
    // This used to be in `$scope.store` in the multi-label-ui 
    // but the enketo libraries store the values internally now, so we move
    // this here
    let viewScope = findViewScope();
    EnketoTripButtonService.updateTripProperties(tripToUpdate, viewScope);  // Redo our inferences, filters, etc. based on this new information
  };

  $scope.init = function() {
      console.log("During initialization, trip is ", $scope.trip);
      $scope.currViewState = findViewState();
  }

  $scope.init();
})
.factory("EnketoTripButtonService", function(InputMatcher, EnketoSurveyAnswer, $timeout) {
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
        etbs.populateManualInputs(trip, trip.nextTrip, etbs.SINGLE_KEY,
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
          userInputEntry = trip.user_input[etbs.inputType2retKey(inputType)];
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

  /*
   * This is a HACK to work around the issue that the label screen and diary
   * screen are not unified. We should remove this, and the timestamp in the
   * userInput field when we do.
   */
  etbs.copyInputIfNewer = function(potentiallyModifiedTrip, originalTrip) {
    let pmInput = potentiallyModifiedTrip.userInput;
    let origInput = originalTrip.userInput;
    if (((pmInput[etbs.SINGLE_KEY] || {}).write_ts || 0) > ((origInput[etbs.SINGLE_KEY] || {}).write_ts || 0)) {
        origInput[etbs.SINGLE_KEY] = pmInput[etbs.SINGLE_KEY];
    }
  }

  etbs.updateTripProperties = function(trip, viewScope) {
    // currently a NOP since we don't have any other trip properties
    return;
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

  /**
   * For a given trip, compute how the "verify" button should behave.
   * If the trip has at least one yellow label, the button should be clickable.
   * If the trip has all green labels, the button should be disabled because everything has already been verified.
   * If the trip has all red labels or a mix of red and green, the button should be disabled because we need more detailed user input.
   */

  etbs.setRecomputeDelay = function(rd) {
    etbs.recomputedelay = rd;
  }

  etbs.updateVerifiability = function(trip) {
    // currently a NOP since we don't have any other trip properties
    trip.verifiability = "cannot-verify";
    return;
  }

  /*
   * Embody the logic for delayed update:
   * the recompute logic already keeps trips that are waitingForModification
   * even if they would be filtered otherwise.
   * so here:
   * - set the trip as waiting for potential modifications
   * - create a one minute timeout that will remove the wait and recompute
   * - clear the existing timeout (if any)
   */
  etbs.updateVisibilityAfterDelay = function(trip, viewScope) {
    // currently a NOP since we don't have any other trip properties
    return;
    // We have just edited this trip, and are now waiting to see if the user
    // is going to modify it further
    trip.waitingForMod = true;
    let currTimeoutPromise = trip.timeoutPromise;
    Logger.log("trip starting at "+trip.start_fmt_time+": creating new timeout of "+etbs.recomputedelay);
    trip.timeoutPromise = $timeout(function() {
      Logger.log("trip starting at "+trip.start_fmt_time+": executing recompute");
      trip.waitingForMod = false;
      trip.timeoutPromise = undefined;
      console.log("Recomputing display trips on ", viewScope);
      viewScope.recomputeDisplayTrips();
    }, etbs.recomputedelay);
    Logger.log("trip starting at "+trip.start_fmt_time+": cancelling existing timeout "+currTimeoutPromise);
    $timeout.cancel(currTimeoutPromise);
  }
  return etbs;
});
