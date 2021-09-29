angular.module('emission.tripconfirm.multilabel',
    ['emission.tripconfirm.services',
        'emission.main.diary.services'])
.directive('multilabel', function() {
  return {
    scope: {
        tripgj: "=",
        unifiedConfirmsResults: "=",
    },
    controller: "MultiLabelCtrl",
    templateUrl: 'templates/tripconfirm/multi-label-ui.html'
  };
})
.controller("MultiLabelCtrl", function($scope, $element, $attrs,
    ConfirmHelper, $ionicPopover, $window, DiaryHelper) {
  console.log("Invoked multilabel directive controller for labels "+ConfirmHelper.INPUTS);

  /**
   * Embed 'inputType' to the trip
   */
  $scope.populateInputFromTimeline = function (tripgj, nextTripgj, inputType, inputList) {
      console.log("While populating inputs, inputParams", $scope.inputParams);
      var userInput = DiaryHelper.getUserInputForTrip(tripgj, nextTripgj, inputList);
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
          tripgj.userInput[inputType] = userInputEntry;
      }
      Logger.log("Set "+ inputType + " " + JSON.stringify(userInputEntry) + " for trip id " + JSON.stringify(tripgj.data.id));
      $scope.editingTrip = angular.undefined;
  }

  $scope.fillUserInputs = function() {
    console.log("Checking to fill user inputs for "
        +$scope.tripgj.display_start_time+" -> "+$scope.tripgj.display_end_time);
    if (angular.isDefined($scope.tripgj)) {
        $scope.$apply(() => {
            $scope.tripgj.userInput = {};
            ConfirmHelper.INPUTS.forEach(function(item, index) {
                $scope.populateInputFromTimeline($scope.tripgj, $scope.tripgj.nextTripgj,
                    item, $scope.unifiedConfirmsResults[item]);
            });
        });
    } else {
        console.log("Trip information not yet bound, skipping fill");
    }
  }

  $scope.$watch("tripgj", function(newVal, oldVal) {
    console.log("the trip binding has changed from "+oldVal+" to new value "+newVal);
    // We also launch this promise from the init.
    // If it is complete by the time the watch completes (the common case), the
    // promise will return immediately
    // but if the promise takes a while, we will still wait here until the data
    // is available.
    // Think of this as assert(inputParams)
    ConfirmHelper.inputParamsPromise.then((inputParams) => {
        $scope.inputParams = inputParams;
        $scope.fillUserInputs();
    });
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

  $scope.openPopover = function ($event, tripgj, inputType) {
    var userInput = tripgj.userInput[inputType];
    if (angular.isDefined(userInput)) {
      $scope.selected[inputType].value = userInput.value;
    } else {
      $scope.selected[inputType].value = '';
    }
    $scope.draftInput = {
      "start_ts": tripgj.data.properties.start_ts,
      "end_ts": tripgj.data.properties.end_ts
    };
    $scope.editingTrip = tripgj;
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
