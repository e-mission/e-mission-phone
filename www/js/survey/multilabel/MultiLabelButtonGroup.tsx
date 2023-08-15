/* A group of stacked buttons that display inferred and confirmed labels.
  In the default configuration, these are the "Mode" and "Purpose" buttons.
  Next to the buttons is a small checkmark icon, which marks inferrel labels as confirmed */

import React, { useContext, useEffect, useState, useMemo } from "react";
import { getAngularService } from "../../angular-react-helper";
import { View, Modal, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { IconButton, Text, Dialog, useTheme, RadioButton, Button, TextInput } from "react-native-paper";
import DiaryButton from "../../diary/DiaryButton";
import { useTranslation } from "react-i18next";
import { LabelTabContext } from "../../diary/LabelTab";
import { displayErrorMsg, logDebug } from "../../plugin/logger";

const MultilabelButtonGroup = ({ trip }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { repopulateTimelineEntry } = useContext(LabelTabContext);
  const { height: windowHeight } = useWindowDimensions();

  const [ inputParams, setInputParams ] = useState({});
  // modal visible for which input type? (mode or purpose or replaced_mode, null if not visible)
  const [ modalVisibleFor, setModalVisibleFor ] = useState<'MODE'|'PURPOSE'|'REPLACED_MODE'|null>(null);
  const [otherLabel, setOtherLabel] = useState<string|null>(null);
  const chosenLabel = useMemo<string>(() => {
    if (otherLabel != null) return 'other';
    return trip.userInput[modalVisibleFor]?.value
  }, [modalVisibleFor, otherLabel]);

  const ConfirmHelper = getAngularService("ConfirmHelper");

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

  function onChooseLabel(chosenValue) {
    logDebug(`onChooseLabel with chosen ${modalVisibleFor} as ${chosenValue}`);
    if (chosenValue == 'other') {
      setOtherLabel('');
    } else {
      store(modalVisibleFor, chosenValue, false);
    }
  }

  function dismiss() {
    setModalVisibleFor(null);
    setOtherLabel(null);
  }

  function store(inputType, chosenLabel, isOther) {
    if (!chosenLabel) return displayErrorMsg("Label is empty");
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
      dismiss();
      repopulateTimelineEntry(trip._id.$oid);
      logDebug("Successfully stored input data "+JSON.stringify(inputDataToStore));
    });
  }

  const inputKeys = Object.keys(trip.inputDetails);
  return (<>
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
                onPress={(e) => setModalVisibleFor(input.name)}
                fillColor={fillColor} />
            </View>
          )
        })}
      </View>
      <View>
        <IconButton icon='check-bold' mode='outlined' size={16} onPress={verifyTrip}
                    disabled={trip.verifiability != 'can-verify'}
                    style={{width: 20, height: 20, margin: 3}}/>
      </View>
    </View>
    <Modal visible={modalVisibleFor} transparent={true} onDismiss={() => dismiss()}>
      <Dialog visible={modalVisibleFor} onDismiss={() => dismiss()}>
        <Pressable>
          <Dialog.Title style={{elevation: 2}}>
            {(modalVisibleFor == 'MODE') && t('diary.select-mode-scroll') ||
              (modalVisibleFor == 'PURPOSE') && t('diary.select-purpose-scroll') ||
              (modalVisibleFor == 'REPLACED_MODE') && t('diary.select-replaced-mode-scroll')}
          </Dialog.Title>
          <Dialog.Content style={{maxHeight: windowHeight/2, paddingBottom: 0}}>
            <ScrollView style={{paddingBottom: 24}}>
              <RadioButton.Group onValueChange={val => onChooseLabel(val)} value={chosenLabel}>
                {inputParams[modalVisibleFor]?.options?.map((o, i) => (
                  // @ts-ignore
                  <RadioButton.Item key={i} label={t(o.text)} value={o.value} style={{paddingVertical: 2}} />
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.Content>
          {otherLabel != null && <>
            <TextInput label={t('trip-confirm.services-please-fill-in', { text: modalVisibleFor?.toLowerCase() })}
              value={otherLabel || ''} onChangeText={(t) => setOtherLabel(t)} />
            <Dialog.Actions>
              <Button onPress={() => store(modalVisibleFor, otherLabel, true)}>
                {t('trip-confirm.services-save')}
              </Button>
            </Dialog.Actions>
          </>}
        </Pressable>
      </Dialog>
    </Modal>
  </>);
};

export default MultilabelButtonGroup;
