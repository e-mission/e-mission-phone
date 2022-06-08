/*
 * Directive to display a set of configurable labels for each trip
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

angular.module('emission.survey.multilabel.buttons',
    ['emission.survey.multilabel.services',
        'emission.stats.clientstats',
        'emission.survey.inputmatcher'])
.directive('multilabel', function() {
  return {
    scope: {
        trip: "=",
        unifiedConfirmsResults: "=",
        recomputedelay: "@",
    },
    controller: "MultiLabelCtrl",
    templateUrl: 'templates/survey/multilabel/multi-label-ui.html'
  };
})
.controller("MultiLabelCtrl", function($scope, $element, $attrs,
    ConfirmHelper, $ionicPopover, $ionicPlatform, $window, ClientStats, MultiLabelService) {
  console.log("Invoked multilabel directive controller for labels "+ConfirmHelper.INPUTS);

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

      for (const inputType of ConfirmHelper.INPUTS) {
        const inferred = $scope.trip.finalInference[inputType];
        // TODO: figure out what to do with "other". For now, do not verify.
        if (inferred && !$scope.trip.userInput[inputType] && inferred != "other") $scope.store(inputType, inferred, false);
      }
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

  MultiLabelService.setRecomputeDelay($scope.recomputedelay);

  $scope.fillUserInputsGeojson = function() {
    console.log("Checking to fill user inputs for "
        +$scope.trip.display_start_time+" -> "+$scope.trip.display_end_time);
    if (angular.isDefined($scope.trip)) {
        $scope.$apply(() => {
            $scope.trip.userInput = {};
            ConfirmHelper.INPUTS.forEach(function(item, index) {
                MultiLabelService.populateInputFromTimeline($scope.trip, $scope.trip.nextTripgj,
                    item, $scope.unifiedConfirmsResults[item]);
            });
        });
    } else {
        console.log("Trip information not yet bound, skipping fill");
    }
  }

  $scope.popovers = {};
  ConfirmHelper.INPUTS.forEach(function(item, index) {
      let popoverPath = 'templates/diary/'+item.toLowerCase()+'-popover.html';
      return $ionicPopover.fromTemplateUrl(popoverPath, {
        scope: $scope
      }).then(function (popover) {
        $scope.popovers[item] = popover;
      });
  });

  $scope.openPopover = function ($event, trip, inputType) {
    var userInput = trip.userInput[inputType];
    if (angular.isDefined(userInput)) {
      $scope.selected[inputType].value = userInput.value;
    } else {
      $scope.selected[inputType].value = '';
    }
    $scope.draftInput = {
      "start_ts": trip.start_ts,
      "end_ts": trip.end_ts
    };
    $scope.editingTrip = trip;
    Logger.log("in openPopover, setting draftInput = " + JSON.stringify($scope.draftInput));
    $scope.popovers[inputType].show($event);
  };

  var closePopover = function (inputType) {
    $scope.selected[inputType] = {
      value: ''
    };
    $scope.popovers[inputType].hide();
  };


  /**
   * Store selected value for options
   * $scope.selected is for display only
   * the value is displayed on popover selected option
   */
  $scope.selected = {}
  ConfirmHelper.INPUTS.forEach(function(item, index) {
      $scope.selected[item] = {value: ''};
  });
  $scope.selected.other = {text: '', value: ''};

  /*
   * This is a curried function that curries the `$scope` variable
   * while returing a function that takes `e` as the input
   */
  var checkOtherOptionOnTap = function ($scope, inputType) {
      return function (e) {
        if (!$scope.selected.other.text) {
          e.preventDefault();
        } else {
          Logger.log("in choose other, other = " + JSON.stringify($scope.selected));
          $scope.store(inputType, $scope.selected.other, true /* isOther */);
          $scope.selected.other = '';
          return $scope.selected.other;
        }
      }
  };

  $scope.choose = function (inputType) {
    ClientStats.addReading(ClientStats.getStatKeys().SELECT_LABEL, {
      "userInput":  angular.toJson($scope.editingTrip.userInput),
      "finalInference": angular.toJson($scope.editingTrip.finalInference),
      "currView": $scope.currentViewState,
      "inputKey": inputType,
      "inputVal": $scope.selected[inputType].value
    });
    var isOther = false
    if ($scope.selected[inputType].value != "other") {
      $scope.store(inputType, $scope.selected[inputType], isOther);
    } else {
      isOther = true
      ConfirmHelper.checkOtherOption(inputType, checkOtherOptionOnTap, $scope);
    }
    closePopover(inputType);
  };

  $scope.store = function (inputType, input, isOther) {
    if(isOther) {
      // Let's make the value for user entered inputs look consistent with our
      // other values
      input.value = ConfirmHelper.otherTextToValue(input.text);
    }
    $scope.draftInput.label = input.value;
    Logger.log("in storeInput, after setting input.value = " + input.value + ", draftInput = " + JSON.stringify($scope.draftInput));
    var tripToUpdate = $scope.editingTrip;
    $window.cordova.plugins.BEMUserCache.putMessage(ConfirmHelper.inputDetails[inputType].key, $scope.draftInput).then(function () {
      $scope.$apply(function() {
        if (isOther) {
          let fakeEntry = ConfirmHelper.getFakeEntry(input.value);
          $scope.inputParams[inputType].options.push(fakeEntry);
          $scope.inputParams[inputType].value2entry[input.value] = fakeEntry;
          tripToUpdate.userInput[inputType] = angular.copy(fakeEntry);
          tripToUpdate.userInput[inputType].write_ts = Date.now();
        } else {
          tripToUpdate.userInput[inputType] = angular.copy($scope.inputParams[inputType].value2entry[input.value]);
          tripToUpdate.userInput[inputType].write_ts = Date.now();
        }
        let viewScope = findViewScope();
       MultiLabelService.updateTripProperties(tripToUpdate, viewScope);  // Redo our inferences, filters, etc. based on this new information
      });
    });
    if (isOther == true)
      $scope.draftInput = angular.undefined;
  }

  $scope.init = function() {
      console.log("During initialization, trip is ", $scope.trip);
      $scope.userInputDetails = [];
      ConfirmHelper.INPUTS.forEach(function(item, index) {
        const currInput = angular.copy(ConfirmHelper.inputDetails[item]);
        currInput.name = item;
        $scope.userInputDetails.push(currInput);
      });
      ConfirmHelper.inputParamsPromise.then((inputParams) => $scope.inputParams = inputParams);
      console.log("Finished initializing directive, userInputDetails = ", $scope.userInputDetails);
      $scope.currViewState = findViewState();
  }

  $ionicPlatform.ready().then(function() {
    $scope.init();
  });
})
.factory("MultiLabelService", function(ConfirmHelper, InputMatcher, $timeout) {
  var mls = {};
  console.log("Creating MultiLabelService");
  ConfirmHelper.inputParamsPromise.then((inputParams) => mls.inputParams = inputParams);
  mls.MANUAL_KEYS = ConfirmHelper.INPUTS.map((inp) => ConfirmHelper.inputDetails[inp].key);

  /**
   * Embed 'inputType' to the trip.
   */

   mls.extractResult = (results) => results;

   mls.processManualInputs = function(manualResults, resultMap) {
     var mrString = 'unprocessed manual inputs '
          + manualResults.map(function(item, index) {
              return ` ${item.length} ${ConfirmHelper.INPUTS[index]}`;
          });
      console.log(mrString);
      manualResults.forEach(function(mr, index) {
        resultMap[ConfirmHelper.INPUTS[index]] = mr;
      });
  }

  mls.populateInputsAndInferences = function(trip, manualResultMap) {
    if (angular.isDefined(trip)) {
        // console.log("Expectation: "+JSON.stringify(trip.expectation));
        // console.log("Inferred labels from server: "+JSON.stringify(trip.inferred_labels));
        trip.userInput = {};
        ConfirmHelper.INPUTS.forEach(function(item, index) {
            mls.populateManualInputs(trip, trip.nextTrip, item,
                manualResultMap[item]);
        });
        trip.finalInference = {};
        mls.inferFinalLabels(trip);
        mls.updateVerifiability(trip);
    } else {
        console.log("Trip information not yet bound, skipping fill");
    }
  }

  /**
   * Embed 'inputType' to the trip
   * This is the version that is called from the list, which focuses only on
   * manual inputs. It also sets some additional values 
   */
  mls.populateManualInputs = function (trip, nextTrip, inputType, inputList) {
      // Check unprocessed labels first since they are more recent
      const unprocessedLabelEntry = InputMatcher.getUserInputForTrip(trip, nextTrip,
          inputList);
      var userInputLabel = unprocessedLabelEntry? unprocessedLabelEntry.data.label : undefined;
      if (!angular.isDefined(userInputLabel)) {
          userInputLabel = trip.user_input[mls.inputType2retKey(inputType)];
      }
      mls.populateInput(trip.userInput, inputType, userInputLabel);
      // Logger.log("Set "+ inputType + " " + JSON.stringify(userInputEntry) + " for trip starting at " + JSON.stringify(trip.start_fmt_time));
      mls.editingTrip = angular.undefined;
  }

  /**
   * Insert the given userInputLabel into the given inputType's slot in inputField
   */
  mls.populateInput = function(tripField, inputType, userInputLabel) {
    if (angular.isDefined(userInputLabel)) {
        console.log("populateInput: looking in map of "+inputType+" for userInputLabel"+userInputLabel);
        var userInputEntry = mls.inputParams[inputType].value2entry[userInputLabel];
        if (!angular.isDefined(userInputEntry)) {
          userInputEntry = ConfirmHelper.getFakeEntry(userInputLabel);
          mls.inputParams[inputType].options.push(userInputEntry);
          mls.inputParams[inputType].value2entry[userInputLabel] = userInputEntry;
        }
        console.log("Mapped label "+userInputLabel+" to entry "+JSON.stringify(userInputEntry));
        tripField[inputType] = userInputEntry;
    }
  }

  /*
   * This is a HACK to work around the issue that the label screen and diary
   * screen are not unified. We should remove this, and the timestamp in the
   * userInput field when we do.
   */
  mls.copyInputIfNewer = function(potentiallyModifiedTrip, originalTrip) {
    ConfirmHelper.INPUTS.forEach(function(item, index) {
        let pmInput = potentiallyModifiedTrip.userInput;
        let origInput = originalTrip.userInput;
        if (((pmInput[item] || {}).write_ts || 0) > ((origInput[item] || {}).write_ts || 0)) {
            origInput[item] = pmInput[item];
        }
    });
  }

  mls.updateTripProperties = function(trip, viewScope) {
    mls.inferFinalLabels(trip);
    mls.updateVerifiability(trip);
    mls.updateVisibilityAfterDelay(trip, viewScope);
  }
  /**
   * Given the list of possible label tuples we've been sent and what the user has already input for the trip, choose the best labels to actually present to the user.
   * The algorithm below operationalizes these principles:
   *   - Never consider label tuples that contradict a green label
   *   - Obey "conservation of uncertainty": the sum of probabilities after filtering by green labels must equal the sum of probabilities before
   *   - After filtering, predict the most likely choices at the level of individual labels, not label tuples
   *   - Never show user yellow labels that have a lower probability of being correct than confidenceThreshold
   */
  mls.inferFinalLabels = function(trip) {
    // Deep copy the possibility tuples
    let labelsList = [];
    if (angular.isDefined(trip.inferred_labels)) {
        labelsList = JSON.parse(JSON.stringify(trip.inferred_labels));
    }

    // Capture the level of certainty so we can reconstruct it later
    const totalCertainty = labelsList.map(item => item.p).reduce(((item, rest) => item + rest), 0);

    // Filter out the tuples that are inconsistent with existing green labels
    for (const inputType of ConfirmHelper.INPUTS) {
      const userInput = trip.userInput[inputType];
      if (userInput) {
        const retKey = mls.inputType2retKey(inputType);
        labelsList = labelsList.filter(item => item.labels[retKey] == userInput.value);
      }
    }

    // Red labels if we have no possibilities left
    if (labelsList.length == 0) {
      for (const inputType of ConfirmHelper.INPUTS) mls.populateInput(trip.finalInference, inputType, undefined);
    }
    else {
      // Normalize probabilities to previous level of certainty
      const certaintyScalar = totalCertainty/labelsList.map(item => item.p).reduce((item, rest) => item + rest);
      labelsList.forEach(item => item.p*=certaintyScalar);

      for (const inputType of ConfirmHelper.INPUTS) {
        // For each label type, find the most probable value by binning by label value and summing
        const retKey = mls.inputType2retKey(inputType);
        let valueProbs = new Map();
        for (const tuple of labelsList) {
          const labelValue = tuple.labels[retKey];
          if (!valueProbs.has(labelValue)) valueProbs.set(labelValue, 0);
          valueProbs.set(labelValue, valueProbs.get(labelValue) + tuple.p);
        }
        let max = {p: 0, labelValue: undefined};
        for (const [thisLabelValue, thisP] of valueProbs) {
          // In the case of a tie, keep the label with earlier first appearance in the labelsList (we used a Map to preserve this order)
          if (thisP > max.p) max = {p: thisP, labelValue: thisLabelValue};
        }

        // Display a label as red if its most probable inferred value has a probability less than or equal to the trip's confidence_threshold
        // Fails safe if confidence_threshold doesn't exist
        if (max.p <= trip.confidence_threshold) max.labelValue = undefined;

        mls.populateInput(trip.finalInference, inputType, max.labelValue);
      }
    }
  }

  /**
   * MODE (becomes manual/mode_confirm) becomes mode_confirm
   */
  mls.inputType2retKey = function(inputType) {
    return ConfirmHelper.inputDetails[inputType].key.split("/")[1];
  }

  /**
   * For a given trip, compute how the "verify" button should behave.
   * If the trip has at least one yellow label, the button should be clickable.
   * If the trip has all green labels, the button should be disabled because everything has already been verified.
   * If the trip has all red labels or a mix of red and green, the button should be disabled because we need more detailed user input.
   */

  mls.setRecomputeDelay = function(rd) {
    mls.recomputedelay = rd;
  }

  mls.updateVerifiability = function(trip) {
    var allGreen = true;
    var someYellow = false;
    for (const inputType of ConfirmHelper.INPUTS) {
        const green = trip.userInput[inputType];
        const yellow = trip.finalInference[inputType] && !green;
        if (yellow) someYellow = true;
        if (!green) allGreen = false;
    }
    trip.verifiability = someYellow ? "can-verify" : (allGreen ? "already-verified" : "cannot-verify");
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
  mls.updateVisibilityAfterDelay = function(trip, viewScope) {
    // We have just edited this trip, and are now waiting to see if the user
    // is going to modify it further
    trip.waitingForMod = true;
    let currTimeoutPromise = trip.timeoutPromise;
    Logger.log("trip starting at "+trip.start_fmt_time+": creating new timeout of "+mls.recomputedelay);
    trip.timeoutPromise = $timeout(function() {
      Logger.log("trip starting at "+trip.start_fmt_time+": executing recompute");
      trip.waitingForMod = false;
      trip.timeoutPromise = undefined;
      console.log("Recomputing display trips on ", viewScope);
      viewScope.recomputeDisplayTrips();
    }, mls.recomputedelay);
    Logger.log("trip starting at "+trip.start_fmt_time+": cancelling existing timeout "+currTimeoutPromise);
    $timeout.cancel(currTimeoutPromise);
  }
  return mls;
});
