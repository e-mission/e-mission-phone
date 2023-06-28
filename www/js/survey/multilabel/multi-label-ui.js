import angular from 'angular';

angular.module('emission.survey.multilabel.buttons',
    ['emission.survey.multilabel.services',
        'emission.stats.clientstats',
        'emission.survey.inputmatcher'])

.factory("MultiLabelService", function($rootScope, ConfirmHelper, InputMatcher, $timeout, $ionicPlatform, DynamicConfig, Logger) {
  var mls = {};
  console.log("Creating MultiLabelService");
  mls.init = function() {
      Logger.log("About to initialize the MultiLabelService");
      ConfirmHelper.inputParamsPromise.then((inputParams) => mls.inputParams = inputParams);
      mls.MANUAL_KEYS = ConfirmHelper.INPUTS.map((inp) => ConfirmHelper.inputDetails[inp].key);
      Logger.log("finished initializing the MultiLabelService");
  };

  $ionicPlatform.ready().then(function() {
    Logger.log("UI_CONFIG: about to call configReady function in MultiLabelService");
    DynamicConfig.configReady().then((newConfig) => {
        mls.init(newConfig);
    }).catch((err) => Logger.displayError("Error while handling config in MultiLabelService", err));
  });

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
        mls.expandInputsIfNecessary(trip);
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
          userInputLabel = trip.user_input?.[mls.inputType2retKey(inputType)];
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

  mls.updateTripProperties = function(trip) {
    // special check for programs
    // TODO: make this part of the dynamic config
    mls.expandInputsIfNecessary(trip);
    mls.inferFinalLabels(trip);
    mls.updateVerifiability(trip);
    mls.updateVisibilityAfterDelay(trip);
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

  /*
   * Uses either 2 or 3 labels depending on the type of install (program vs. study)
   * and the primary mode.
   * This used to be in the controller, where it really should be, but we had
   * to move it to the service because we need to invoke it from the list view
   * as part of filtering "To Label" entries.
   *
   * TODO: Move it back later after the diary vs. label unification
   */
  mls.expandInputsIfNecessary = function(trip) {
    console.log("Reading expanding inputs for ", trip);
    const inputValue = trip.userInput["MODE"]? trip.userInput["MODE"].value : undefined;
    console.log("Experimenting with expanding inputs for mode "+inputValue);
    if (ConfirmHelper.isProgram) {
        if (inputValue == ConfirmHelper.mode_studied) {
            Logger.log("Found "+ConfirmHelper.mode_studied+" mode in a program, displaying full details");
            trip.inputDetails = ConfirmHelper.inputDetails;
            trip.INPUTS = ConfirmHelper.INPUTS;
        } else {
            Logger.log("Found non "+ConfirmHelper.mode_studied+" mode in a program, displaying base details");
            trip.inputDetails = ConfirmHelper.baseInputDetails;
            trip.INPUTS = ConfirmHelper.BASE_INPUTS;
        }
    } else {
        Logger.log("study, not program, displaying full details");
        trip.INPUTS = ConfirmHelper.INPUTS;
        trip.inputDetails = ConfirmHelper.inputDetails;
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
    for (const inputType of trip.INPUTS) {
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
  mls.updateVisibilityAfterDelay = function(trip) {
    // We have just edited this trip, and are now waiting to see if the user
    // is going to modify it further
    trip.waitingForMod = true;
    let currTimeoutPromise = trip.timeoutPromise;
    Logger.log("trip starting at "+trip.start_fmt_time+": creating new timeout of "+mls.recomputedelay);
    trip.timeoutPromise = $timeout(function() {
      Logger.log("trip starting at "+trip.start_fmt_time+": executing recompute");
      trip.waitingForMod = false;
      trip.timeoutPromise = undefined;
      $rootScope.$broadcast("recomputeListEntries");
    }, mls.recomputedelay);
    Logger.log("trip starting at "+trip.start_fmt_time+": cancelling existing timeout "+currTimeoutPromise);
    $timeout.cancel(currTimeoutPromise);
  }
  return mls;
});
