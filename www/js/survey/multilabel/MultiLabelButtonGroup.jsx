/* A group of stacked buttons that display inferred and confirmed labels
In the default configuration, these are the "Mode" and "Purpose" buttons */

import React, { useEffect, useState } from "react";
import { angularize, getAngularService } from "../../angular-react-helper";
import { object, number } from "prop-types";
import { View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import DiaryButton from "../../diary/DiaryButton";
import { useTranslation } from "react-i18next";
import ModeSelectMenu from "./ModeSelectMenu";

const MultilabelButtonGroup = ({ trip, unifiedConfirmsResults, recomputeDelay }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [ selected ] = useState({});
  const [ popovers, setPopovers ] = useState({});
  const [ inputParams, setInputParams ] = useState({});

  const ConfirmHelper = getAngularService("ConfirmHelper");
  const $ionicPopover = getAngularService("$ionicPopover");

  useEffect(() => {
    console.log("During initialization, trip is ", trip);
    console.log("Invoked multilabel directive controller for labels "+ConfirmHelper.INPUTS);
    // We used to fill in the `name` for each input detail entry here
    // and store the set of input details in the controller
    // however, with the functionality of having the replaced mode
    // only shown for certain trips, we are storing the details in the trip.
    // which means that we really don't want to initialize it here.
    // https://github.com/e-mission/e-mission-docs/issues/764

    // ConfirmHelper.INPUTS.forEach(function(item, index) {
    //     let popoverPath = 'templates/diary/'+item.toLowerCase()+'-popover.html';
    //     return $ionicPopover.fromTemplateUrl(popoverPath, {
    //     }).then(function (popover) {
    //       popovers[item] = popover;
    //     });
    // });
    // console.log("After initializing popovers", popovers);

    /**
     * Store selected value for options
     * $scope.selected is for display only
     * the value is displayed on popover selected option
     */
    ConfirmHelper.INPUTS.forEach(function(item, index) {
        selected[item] = {value: ''};
    });
    selected.other = {text: '', value: ''};

    ConfirmHelper.inputParamsPromise.then((ip) => setInputParams(ip));
    console.log("Finished initializing directive, popovers = ", popovers);
  }, []);

  // marks 'inferred' labels as 'confirmed'; turns yellow labels blue
  // called from another component
  function verifyTrip() {
    // TODO
  }

  function openPopover(inputType) {
    const userInput = trip.userInput[inputType];
    
    console.debug("in openPopover, inputType = ", inputType);
    console.debug("in openPopover, userInput = ", userInput);
    if (angular.isDefined(userInput)) {
      selected[inputType].value = userInput.value;
    } else {
      selected[inputType].value = '';
    }
    // $scope.draftInput = {
    //   "start_ts": trip.start_ts,
    //   "end_ts": trip.end_ts
    // };
    // $scope.editingTrip = trip;
    // Logger.log("in openPopover, setting draftInput = " + JSON.stringify($scope.draftInput));
    setPopovers({...popovers, [inputType]: true});
    console.debug("in openPopover, popovers = ", popovers);
  }

  function choose(inputType, chosenLabel) {
    // ClientStats.addReading(ClientStats.getStatKeys().SELECT_LABEL, {
    //   "userInput":  angular.toJson($scope.editingTrip.userInput),
    //   "finalInference": angular.toJson($scope.editingTrip.finalInference),
    //   "currView": $scope.currentViewState,
    //   "inputKey": inputType,
    //   "inputVal": $scope.selected[inputType].value
    // });
    let isOther = false;
    if (chosenLabel != "other") {
      store(inputType, chosenLabel, isOther);
    } else {
      isOther = true
      // ConfirmHelper.checkOtherOption(inputType, checkOtherOptionOnTap, $scope);
    }
    setPopovers({...popovers, [inputType]: false});
  };

  function store(inputType, input, isOther) {
    if(isOther) {
      // Let's make the value for user entered inputs look consistent with our
      // other values
      input.value = ConfirmHelper.otherTextToValue(input.text);
    }
    const inputDataToStore = {
      "start_ts": trip.start_ts,
      "end_ts": trip.end_ts,
      "label": input.value
    };

    window.cordova.plugins.BEMUserCache.putMessage(ConfirmHelper.inputDetails[inputType].key, inputDataToStore).then(function () {
      // $scope.$apply(function() {
      //   if (isOther) {
      //     let fakeEntry = ConfirmHelper.getFakeEntry(input.value);
      //     $scope.inputParams[inputType].options.push(fakeEntry);
      //     $scope.inputParams[inputType].value2entry[input.value] = fakeEntry;
      //     tripToUpdate.userInput[inputType] = angular.copy(fakeEntry);
      //     tripToUpdate.userInput[inputType].write_ts = Date.now();
      //   } else {
      //     tripToUpdate.userInput[inputType] = angular.copy($scope.inputParams[inputType].value2entry[input.value]);
      //     tripToUpdate.userInput[inputType].write_ts = Date.now();
      //   }
      //   MultiLabelService.updateTripProperties(tripToUpdate);  // Redo our inferences, filters, etc. based on this new information
      //   // KS: this will currently always trigger for a program
      //   // we might want to trigger it only if it changed to/from the mode studied
      //   // you may also need to experiment with moving this up or down depending on timing
      //   needsResize? $rootScope.$broadcast('scrollResize') : console.log("not in list, skipping resize");
      // });
      console.debug("Successfully stored input data "+JSON.stringify(inputDataToStore));
    });
    if (isOther == true)
      $scope.draftInput = angular.undefined;
  }

  const inputKeys = Object.keys(trip.inputDetails);
  return (
    <>
      {inputKeys.map((key) => {
        const input = trip.inputDetails[key];
        const inputIsConfirmed = trip.userInput[input.name];
        const inputIsInferred = trip.finalInference[input.name];
        let fillColor;
        if (inputIsConfirmed) {
          fillColor = colors.primary;
        } else if (inputIsInferred) {
          fillColor = colors.primaryContainer;
        }
        const btnText = inputIsConfirmed?.text || inputIsInferred?.text || input.choosetext;

        return (
          <View key={trip._id['$oid'] + '_' + input.name}>
            <Text>{t(input.labeltext)}</Text>
            <ModeSelectMenu visible={popovers[key]}
                          inputParams={inputParams}
                          chooseFn={choose}
                          anchor={{x: -100, y: -300}} />
            <DiaryButton text={t(btnText)}
                        onPress={() => openPopover(input.name)}
                        fillColor={fillColor} />
          </View>
        )
      })}
    </>
  );
};

const styles = {
  badge: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 0,
    fontSize: 12.5,
  },
  time: {
    fontWeight: 500, // medium / semibold
  },
  date: {
    fontWeight: 300, // light
  }
}
MultilabelButtonGroup.propTypes = {
  trip: object,
  recomputeDelay: number,
}

angularize(MultilabelButtonGroup, 'emission.main.diary.multilabelbtngroup');
export default MultilabelButtonGroup;
