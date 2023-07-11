/* A group of stacked buttons that display inferred and confirmed labels.
  In the default configuration, these are the "Mode" and "Purpose" buttons.
  Next to the buttons is a small checkmark icon, which marks inferrel labels as confirmed */

import React, { useContext, useEffect, useState } from "react";
import { angularize, createScopeWithVars, getAngularService } from "../../angular-react-helper";
import { object, number } from "prop-types";
import { View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import DiaryButton from "../../diary/DiaryButton";
import { useTranslation } from "react-i18next";
import { LabelTabContext } from "../../diary/LabelTab";

const MultilabelButtonGroup = ({ trip }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { repopulateTimelineEntry } = useContext(LabelTabContext);

  const [ inputParams, setInputParams ] = useState({});
  let closePopover;

  const ConfirmHelper = getAngularService("ConfirmHelper");
  const $ionicPopup = getAngularService("$ionicPopup");
  const $ionicPopover = getAngularService("$ionicPopover");

  useEffect(() => {
    console.log("During initialization, trip is ", trip);
    ConfirmHelper.inputParamsPromise.then((ip) => setInputParams(ip));
  }, []);

  // to mark 'inferred' labels as 'confirmed'; turn yellow labels blue
  function verifyTrip() {
    for (const inputType of ConfirmHelper.INPUTS) {
      const inferred = trip.finalInference[inputType];
      // TODO: figure out what to do with "other". For now, do not verify.
      if (inferred?.value && !trip.userInput[inputType] && inferred.value != "other")
        store(inputType, inferred.value, false);
    }
  }

  function openPopover(e, inputType) {
    let popoverPath = 'templates/diary/'+inputType.toLowerCase()+'-popover.html';
    const scope = createScopeWithVars({inputParams, choose});
    $ionicPopover.fromTemplateUrl(popoverPath, {scope}).then((pop) => {
      closePopover = () => pop.hide();
      pop.show(e);
    });
  }

  function choose(inputType, chosenLabel, wasOther=false) {
    if (chosenLabel && chosenLabel != "other") {
      store(inputType, chosenLabel, wasOther);
    } else {
      const scope = createScopeWithVars({other: {text: ''}});
      $ionicPopup.show({
        scope,
        title: t("trip-confirm.services-please-fill-in", { text: inputType.toLowerCase() }),
        template: '<input type="text" ng-model="other.text">',
        buttons: [
          {
            text: t('trip-confirm.services-cancel')
          },
          {
            text: `<b>${t('trip-confirm.services-save')}</b>`,
            type: 'button-positive',
            onTap: () => choose(inputType, scope.other.text, true)
          }
        ]
      });
    }
  };

  function store(inputType, chosenLabel, isOther) {
    if (isOther) {
      /* Let's make the value for user entered inputs look consistent with our other values
       (i.e. lowercase, and with underscores instead of spaces) */
      chosenLabel = chosenLabel.toLowerCase().replace(" ", "_");
    }
    const inputDataToStore = {
      "start_ts": trip.start_ts,
      "end_ts": trip.end_ts,
      "label": chosenLabel,
    };

    const storageKey = ConfirmHelper.inputDetails[inputType].key;
    window['cordova'].plugins.BEMUserCache.putMessage(storageKey, inputDataToStore).then(() => {
      closePopover?.();
      repopulateTimelineEntry(trip._id.$oid);
      console.debug("Successfully stored input data "+JSON.stringify(inputDataToStore));
    });
  }

  const inputKeys = Object.keys(trip.inputDetails);
  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <View style={{width: 'calc(100% - 20px)'}}>
        {inputKeys.map((key, i) => {
          const input = trip.inputDetails[key];
          const inputIsConfirmed = trip.userInput[input.name];
          const inputIsInferred = trip.finalInference[input.name];
          let fillColor;
          if (inputIsConfirmed) {
            fillColor = colors.primary;
          } else if (inputIsInferred) {
            fillColor = colors.secondary;
          }
          const btnText = inputIsConfirmed?.text || inputIsInferred?.text || input.choosetext;

          return (
            <View key={i}>
              <Text>{t(input.labeltext)}</Text>
              <DiaryButton text={t(btnText)}
                onPress={(e) => openPopover(e, input.name)}
                fillColor={fillColor} />
            </View>
          )
        })}
      </View>
      <View>
        <IconButton icon='check-bold' mode='outlined' size={16} onPress={verifyTrip}
                    disabled={trip.verifiability == 'cannot-verify'}
                    style={{width: 20, height: 20, margin: 3}}/>
      </View>
    </View>
  );
};

MultilabelButtonGroup.propTypes = {
  trip: object,
  recomputeDelay: number,
}

angularize(MultilabelButtonGroup, 'MultilabelButtonGroup', 'emission.main.diary.multilabelbtngroup');
export default MultilabelButtonGroup;
