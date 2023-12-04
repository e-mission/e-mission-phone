/* A group of stacked buttons that display inferred and confirmed labels.
  In the default configuration, these are the "Mode" and "Purpose" buttons.
  Next to the buttons is a small checkmark icon, which marks inferrel labels as confirmed */

import React, { useContext, useEffect, useState, useMemo } from 'react';
import { getAngularService } from '../../angular-react-helper';
import { View, Modal, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import {
  IconButton,
  Text,
  Dialog,
  useTheme,
  RadioButton,
  Button,
  TextInput,
} from 'react-native-paper';
import DiaryButton from '../../components/DiaryButton';
import { useTranslation } from 'react-i18next';
import LabelTabContext from '../../diary/LabelTabContext';
import { displayError, displayErrorMsg, logDebug } from '../../plugin/logger';
import {
  getLabelInputDetails,
  getLabelInputs,
  inferFinalLabels,
  labelInputDetailsForTrip,
  labelKeyToRichMode,
  readableLabelToKey,
  verifiabilityForTrip,
} from './confirmHelper';
import useAppConfig from '../../useAppConfig';
import { createMode } from '../../services/commHelper';

// This will be sorted by frequency and createdAt from server
const DUMMY_CUSTOMIZED_MODE = {
  'jiji-car': {
    createdAt: new Date(),
    frequency: 10,
    isActive: true,
  },
  'jiji-ebike': {
    createdAt: new Date(),
    frequency: 10,
    isActive: true,
  },
  longlongtextlonglongtext: {
    createdAt: new Date(),
    frequency: 3,
    isActive: true,
  },
};

const MultilabelButtonGroup = ({ trip, buttonsInline = false }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const appConfig = useAppConfig();
  const { repopulateTimelineEntry, labelOptions, timelineLabelMap } = useContext(LabelTabContext);
  const { height: windowHeight } = useWindowDimensions();

  // modal visible for which input type? (mode or purpose or replaced_mode, null if not visible)
  const [modalVisibleFor, setModalVisibleFor] = useState<
    'MODE' | 'PURPOSE' | 'REPLACED_MODE' | null
  >(null);
  const [otherLabel, setOtherLabel] = useState<string | null>(null);
  const chosenLabel = useMemo<string>(() => {
    if (otherLabel != null) return 'other';
    return timelineLabelMap[trip._id.$oid]?.[modalVisibleFor]?.value;
  }, [modalVisibleFor, otherLabel]);

  // to mark 'inferred' labels as 'confirmed'; turn yellow labels blue
  function verifyTrip() {
    const inferredLabelsForTrip = inferFinalLabels(trip, timelineLabelMap[trip._id.$oid]);
    for (const inputType of getLabelInputs()) {
      const inferred = inferredLabelsForTrip?.[inputType];
      // if the is an inferred label that is not already confirmed, confirm it now by storing it
      if (inferred?.value && !timelineLabelMap[trip._id.$oid]?.[inputType]) {
        store(inputType, inferred.value, false);
      }
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
    if (!chosenLabel) return displayErrorMsg('Label is empty');
    if (isOther) {
      /* Let's make the value for user entered inputs look consistent with our other values
       (i.e. lowercase, and with underscores instead of spaces) */
      chosenLabel = readableLabelToKey(chosenLabel);
      createMode(chosenLabel)
      .then((res) => {
        logDebug('Create Mode in CommHelper result ' + JSON.stringify(res));
      })
      .catch((e) => {
        displayError(e, 'Create Mode Error')
      })
    }
    const inputDataToStore = {
      start_ts: trip.start_ts,
      end_ts: trip.end_ts,
      label: chosenLabel,
    };

    const storageKey = getLabelInputDetails()[inputType].key;
    window['cordova'].plugins.BEMUserCache.putMessage(storageKey, inputDataToStore).then(() => {
      dismiss();
      repopulateTimelineEntry(trip._id.$oid);
      logDebug('Successfully stored input data ' + JSON.stringify(inputDataToStore));
    });
  }

  const tripInputDetails = labelInputDetailsForTrip(timelineLabelMap[trip._id.$oid], appConfig);
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, flexDirection: buttonsInline ? 'row' : 'column', columnGap: 8 }}>
          {Object.keys(tripInputDetails).map((key, i) => {
            const input = tripInputDetails[key];
            const inputIsConfirmed = timelineLabelMap[trip._id.$oid]?.[input.name];
            const inputIsInferred = inferFinalLabels(trip, timelineLabelMap[trip._id.$oid])[
              input.name
            ];
            let fillColor, textColor, borderColor;
            if (inputIsConfirmed) {
              fillColor = colors.primary;
            } else if (inputIsInferred) {
              fillColor = colors.secondaryContainer;
              borderColor = colors.secondary;
              textColor = colors.onSecondaryContainer;
            }
            const btnText = inputIsConfirmed?.text || inputIsInferred?.text || input.choosetext;

            return (
              <View key={i} style={{ flex: 1 }}>
                <Text>{t(input.labeltext)}</Text>
                <DiaryButton
                  fillColor={fillColor}
                  borderColor={borderColor}
                  textColor={textColor}
                  onPress={(e) => setModalVisibleFor(input.name)}>
                  {t(btnText)}
                </DiaryButton>
              </View>
            );
          })}
        </View>
        {verifiabilityForTrip(trip, timelineLabelMap[trip._id.$oid]) == 'can-verify' && (
          <View style={{ marginTop: 16 }}>
            <IconButton
              icon="check-bold"
              mode="outlined"
              size={18}
              onPress={verifyTrip}
              containerColor={colors.secondaryContainer}
              style={{ width: 24, height: 24, margin: 3, borderColor: colors.secondary }}
            />
          </View>
        )}
      </View>
      <Modal visible={modalVisibleFor != null} transparent={true} onDismiss={() => dismiss()}>
        <Dialog visible={modalVisibleFor != null} onDismiss={() => dismiss()}>
          <Pressable>
            <Dialog.Title style={{ elevation: 2 }}>
              {(modalVisibleFor == 'MODE' && t('diary.select-mode-scroll')) ||
                (modalVisibleFor == 'PURPOSE' && t('diary.select-purpose-scroll')) ||
                (modalVisibleFor == 'REPLACED_MODE' && t('diary.select-replaced-mode-scroll'))}
            </Dialog.Title>
            <Dialog.Content style={{ maxHeight: windowHeight / 2, paddingBottom: 0 }}>
              <ScrollView style={{ paddingBottom: 24 }}>
                <RadioButton.Group onValueChange={(val) => onChooseLabel(val)} value={chosenLabel}>
                  {labelOptions?.[modalVisibleFor]?.map((o, i) => (
                    // @ts-ignore
                    <RadioButton.Item
                      key={i}
                      label={t(o.text)}
                      value={o.value}
                      style={{ paddingVertical: 2 }}
                    />
                  ))}
                  {Object.keys(DUMMY_CUSTOMIZED_MODE).map((key, i) => (
                    // @ts-ignore
                    <RadioButton.Item
                      key={key + i}
                      label={key}
                      value={key}
                      style={{ paddingVertical: 2 }}
                    />
                  ))}
                </RadioButton.Group>
              </ScrollView>
            </Dialog.Content>
            {otherLabel != null && (
              <>
                <TextInput
                  label={t('trip-confirm.services-please-fill-in', {
                    text: modalVisibleFor?.toLowerCase(),
                  })}
                  value={otherLabel || ''}
                  onChangeText={(t) => setOtherLabel(t)}
                  maxLength={25}
                />
                <Dialog.Actions>
                  <Button onPress={() => store(modalVisibleFor, otherLabel, true)}>
                    {t('trip-confirm.services-save')}
                  </Button>
                </Dialog.Actions>
              </>
            )}
          </Pressable>
        </Dialog>
      </Modal>
    </>
  );
};

export default MultilabelButtonGroup;
