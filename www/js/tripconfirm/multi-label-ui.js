angular.module('emission.tripconfirm.multilabel',
    ['emission.tripconfirm.services',
        'emission.stats.clientstats',
        'emission.main.diary.services'])
.directive('multilabel', function() {
  return {
    scope: {
        trip: "=",
        unifiedConfirmsResults: "=",
    },
    controller: "MultiLabelCtrl",
    templateUrl: 'templates/tripconfirm/multi-label-ui.html'
  };
})
.controller("MultiLabelCtrl", function($scope, $element, $attrs,
    ConfirmHelper, $ionicPopover, $window, DiaryHelper, ClientStats) {
  console.log("Invoked multilabel directive controller for labels "+ConfirmHelper.INPUTS);

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
    $scope.verifyTrip = function() {
      console.log("About to verify trip "+$scope.trip.start_ts
        +" -> "+$scope.trip.end_ts+" with current visibility"
        + $scope.trip.verifiability);
      if ($scope.trip.verifiability != "can-verify") {
        ClientStats.addReading(ClientStats.getStatKeys().VERIFY_TRIP, {"verifiable": false});
        return;
      }
      ClientStats.addReading(ClientStats.getStatKeys().VERIFY_TRIP, {"verifiable": true, "userInput": angular.toJson(trip.userInput), "finalInference": angular.toJson(trip.finalInference)});

      $scope.draftInput = {
        "start_ts": trip.start_ts,
        "end_ts": trip.end_ts
      };
      $scope.editingTrip = trip;

      for (const inputType of ConfirmHelper.INPUTS) {
        const inferred = trip.finalInference[inputType];
        // TODO: figure out what to do with "other". For now, do not verify.
        if (inferred && !trip.userInput[inputType] && inferred != "other") $scope.store(inputType, inferred, false);
      }
    }

  /*
   * END: Required external interface for all label directives
   */

  /**
   * Embed 'inputType' to the trip
   */
  $scope.populateInputFromTimeline = function (trip, nextTripgj, inputType, inputList) {
      console.log("While populating inputs, inputParams", $scope.inputParams);
      var userInput = DiaryHelper.getUserInputForTrip(trip, nextTripgj, inputList);
      if (angular.isDefined(userInput)) {
          // userInput is an object with data + metadata
          // the label is the "value" from the options
          var userInputEntry = $scope.inputParams[inputType].value2entry[userInput.data.label];
          if (!angular.isDefined(userInputEntry)) {
            userInputEntry = ConfirmHelper.getFakeEntry(userInput.data.label);
            $scope.inputParams[inputType].options.push(userInputEntry);
            $scope.inputParams[inputType].value2entry[userInput.data.label] = userInputEntry;
          }
          console.log("Mapped label "+userInput.data.label+" to entry "+JSON.stringify(userInputEntry));
          trip.userInput[inputType] = userInputEntry;
      }
      Logger.log("Set "+ inputType + " " + JSON.stringify(userInputEntry) + " for trip id " + JSON.stringify(trip.data.id));
      $scope.editingTrip = angular.undefined;
  }

  $scope.fillUserInputs = function() {
    console.log("Checking to fill user inputs for "
        +$scope.trip.display_start_time+" -> "+$scope.trip.display_end_time);
    if (angular.isDefined($scope.trip)) {
        $scope.$apply(() => {
            $scope.trip.userInput = {};
            ConfirmHelper.INPUTS.forEach(function(item, index) {
                $scope.populateInputFromTimeline($scope.trip, $scope.trip.nextTripgj,
                    item, $scope.unifiedConfirmsResults[item]);
            });
        });
    } else {
        console.log("Trip information not yet bound, skipping fill");
    }
  }

  $scope.$watch("trip", function(newVal, oldVal) {
    console.log("the trip binding has changed from "+oldVal+" to new value "+newVal);
    // We also launch this promise from the init.
    // If it is complete by the time the watch completes (the common case), the
    // promise will return immediately
    // but if the promise takes a while, we will still wait here until the data
    // is available.
    // Think of this as assert(inputParams)
    if ($scope.unifiedConfirmsResults != undefined) {
        ConfirmHelper.inputParamsPromise.then((inputParams) => {
            $scope.inputParams = inputParams;
            $scope.fillUserInputs();
        });
        console.log("After filling user inputs", $scope.trip);
    } else {
        console.log("No input list defined, skipping manual user input fill", $scope.unifiedConfirmsResults);
    }
  });

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
      "start_ts": trip.data.properties.start_ts,
      "end_ts": trip.data.properties.end_ts
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
          tripToUpdate.userInput[inputType] = ConfirmHelper.getFakeEntry(input.value);
          $scope.inputParams[inputType].options.push(tripToUpdate.userInput[inputType]);
          $scope.inputParams[inputType].value2entry[input.value] = tripToUpdate.userInput[inputType];
        } else {
          tripToUpdate.userInput[inputType] = $scope.inputParams[inputType].value2entry[input.value];
        }
      });
    });
    if (isOther == true)
      $scope.draftInput = angular.undefined;
  }

  $scope.init = function() {
      $scope.userInputDetails = [];
      ConfirmHelper.INPUTS.forEach(function(item, index) {
        const currInput = angular.copy(ConfirmHelper.inputDetails[item]);
        currInput.name = item;
        $scope.userInputDetails.push(currInput);
      });
      ConfirmHelper.inputParamsPromise.then((inputParams) => $scope.inputParams = inputParams);
      console.log("Finished initializing directive, userInputDetails = ", $scope.userInputDetails);
  }

  $scope.init();
});
