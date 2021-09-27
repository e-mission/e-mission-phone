angular.module('emission.tripconfirm.multilabel',
    ['emission.tripconfirm.services',
        'emission.main.diary.services'])
.directive('multilabel', function(ConfirmHelper, $ionicPopover, $window, DiaryHelper) {
  return {
    scope: {
        inputs: "=",
        tripgj: "=",
        unifiedConfirmsResults: "=",
        inputParams: "=inputparams" // use nocase inputs to maintain consistency between  HTML and scope parameters
    },
    controller: function($scope, $element) {
      console.log("Invoked directive controller with "+$element);
      console.log($scope);
      console.log("unifiedresults "+$scope.unifiedConfirmsResults);
      console.log("scope trip information is "+$scope.tripgj);
      console.log("scope inputs are "+$scope.inputs);

      /**
       * Embed 'inputType' to the trip
       */
      $scope.populateInputFromTimeline = function (tripgj, nextTripgj, inputType, inputList) {
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
        console.log("Checking to fill user inputs for "+$scope.tripgj);
        if (angular.isDefined($scope.tripgj)) {
            $scope.tripgj.userInput = {};
            ConfirmHelper.INPUTS.forEach(function(item, index) {
                $scope.populateInputFromTimeline($scope.tripgj, $scope.tripgj.nextTripgj,
                    item, $scope.unifiedConfirmsResults[item]);
            });
        } else {
            console.log("Trip information not yet bound, skipping fill");
        }
      }

      $scope.init = function() {
          $scope.userInputDetails = [];
          $scope.inputs.forEach(function(item, index) {
            const currInput = angular.copy(ConfirmHelper.inputDetails[item]);
            currInput.name = item;
            $scope.userInputDetails.push(currInput);
          });
          console.log("Finished initializing directive, userInputDetails = "+JSON.stringify($scope.userInputDetails));
          console.log("Before filling user inputs, trip is = "+JSON.stringify($scope.tripgj));
      }

      $scope.$watch("tripgj", function(newVal, oldVal) {
        console.log("the trip binding has changed from "+oldVal+" to new value");
        $scope.fillUserInputs();
      });
    
      $scope.popovers = {};
      $scope.inputs.forEach(function(item, index) {
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
      $scope.inputs.forEach(function(item, index) {
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
      console.log('registering loaded callback in directive');
      $element.on('$ionicView.loaded', function() {
          console.log('ionic view loaded event invoked');
          $scope.inputParams = {}
          ConfirmHelper.INPUTS.forEach(function(item) {
              ConfirmHelper.getOptionsAndMaps(item).then(function(omObj) {
                  $scope.inputParams[item] = omObj;
              });
          });
          console.log("after loading in directive, inputParams = "+JSON.stringify($scope.inputParams));
      });
      $scope.init();
    },
    templateUrl: 'templates/tripconfirm/multi-label-ui.html',
    link: function(scope, element, attrs, ctrl) {
        console.log("link function called with "+scope+" and ctrl "+ctrl);
        console.log(scope);
        console.log("unifiedresults "+scope.unifiedConfirmsResults);
        console.log("scope trip information is "+scope.tripgj);
        console.log("scope inputs are "+scope.inputs);
    }
  };
});
