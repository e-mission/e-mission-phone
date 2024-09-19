import { fetchUrlCached } from '../../services/commHelper';
import i18next from 'i18next';
import { logDebug } from '../../plugin/logger';
import { LabelOption, LabelOptions, MultilabelKey, InputDetails } from '../../types/labelTypes';
import { CompositeTrip, InferredLabels, TimelineEntry } from '../../types/diaryTypes';
import { UserInputMap } from '../../TimelineContext';
import DEFAULT_LABEL_OPTIONS from 'e-mission-common/src/emcommon/resources/label-options.default.json';

let appConfig;
export let labelOptions: LabelOptions;
export let inputDetails: InputDetails<MultilabelKey>;

export async function getLabelOptions(appConfigParam?) {
  if (appConfigParam) appConfig = appConfigParam;
  if (labelOptions) return labelOptions;
  if (appConfig.label_options) {
    const labelOptionsJson = await fetchUrlCached(appConfig.label_options);
    if (labelOptionsJson) {
      logDebug(`label_options found in config, using dynamic label options 
        at ${appConfig.label_options}`);
      labelOptions = JSON.parse(labelOptionsJson) as LabelOptions;
    } else {
      throw new Error('Label options were falsy from ' + appConfig.label_options);
    }
  } else {
    labelOptions = DEFAULT_LABEL_OPTIONS;
  }
  return labelOptions;
}

export const labelOptionByValue = (value: string, labelType: string): LabelOption | undefined =>
  labelOptions[labelType]?.find((o) => o.value == value) || getFakeEntry(value);

export const baseLabelInputDetails = {
  MODE: {
    name: 'MODE',
    labeltext: 'diary.mode',
    choosetext: 'diary.choose-mode',
    key: 'manual/mode_confirm',
  },
  PURPOSE: {
    name: 'PURPOSE',
    labeltext: 'diary.purpose',
    choosetext: 'diary.choose-purpose',
    key: 'manual/purpose_confirm',
  },
};

export function getLabelInputDetails(appConfigParam?) {
  if (appConfigParam) appConfig = appConfigParam;
  if (inputDetails) return inputDetails;

  if (!appConfig.intro.mode_studied) {
    /* If there is no mode of interest, we don't need REPLACED_MODE.
      So just return the base input details. */
    return baseLabelInputDetails;
  }
  // else this is a program, so add the REPLACED_MODE
  inputDetails = {
    ...baseLabelInputDetails,
    REPLACED_MODE: {
      name: 'REPLACED_MODE',
      labeltext: 'diary.replaces',
      choosetext: 'diary.choose-replaced-mode',
      key: 'manual/replaced_mode',
    },
  };
  return inputDetails;
}

export function labelInputDetailsForTrip(userInputForTrip, appConfigParam?) {
  if (appConfigParam) appConfig = appConfigParam;
  if (appConfig.intro.mode_studied) {
    if (userInputForTrip?.['MODE']?.data?.label == appConfig.intro.mode_studied) {
      logDebug(`Found trip labeled with ${userInputForTrip?.['MODE']?.data?.label}, mode of study = ${appConfig.intro.mode_studied}.
        Needs REPLACED_MODE`);
      return getLabelInputDetails();
    } else {
      return baseLabelInputDetails;
    }
  } else {
    return getLabelInputDetails();
  }
}

export const getLabelInputs = () => Object.keys(getLabelInputDetails()) as MultilabelKey[];
export const getBaseLabelInputs = () => Object.keys(baseLabelInputDetails) as MultilabelKey[];

/** @description replace all underscores with spaces, and capitalizes the first letter of each word */
export function labelKeyToReadable(otherValue: string) {
  if (otherValue == otherValue.toUpperCase()) {
    // if all caps, make lowercase
    otherValue = otherValue.toLowerCase();
  }
  const words = otherValue.replace(/_/g, ' ').trim().split(' ');
  if (words.length == 0) return '';
  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

/** @description replaces all spaces with underscores, and lowercases the string */
export const readableLabelToKey = (otherText: string) =>
  otherText.trim().replace(/ /g, '_').toLowerCase();

export function getFakeEntry(otherValue): Partial<LabelOption> | undefined {
  if (!otherValue) return undefined;
  return {
    value: otherValue,
  };
}

export let labelTextToKeyMap: { [key: string]: string } = {};

export const labelKeyToText = (labelKey: string) => {
  const lang = i18next.resolvedLanguage || 'en';
  const text =
    labelOptions?.translations?.[lang]?.[labelKey] ||
    labelOptions?.translations?.[lang]?.[labelKey] ||
    labelKeyToReadable(labelKey);
  labelTextToKeyMap[text] = labelKey;
  return text;
};

export const textToLabelKey = (text: string) => labelTextToKeyMap[text] || readableLabelToKey(text);

/** @description e.g. manual/mode_confirm becomes mode_confirm */
export const removeManualPrefix = (key: string) => key.split('/')[1];
/** @description e.g. 'MODE' gets looked up, its key is 'manual/mode_confirm'. Returns without prefix as 'mode_confirm' */
export const inputType2retKey = (inputType: string) =>
  removeManualPrefix(getLabelInputDetails()[inputType].key);

export function verifiabilityForTrip(trip: CompositeTrip, userInputForTrip?: UserInputMap) {
  let allConfirmed = true;
  let someInferred = false;
  const inputsForTrip = Object.keys(labelInputDetailsForTrip(userInputForTrip));
  for (const inputType of inputsForTrip) {
    const finalInference = inferFinalLabels(trip, userInputForTrip)[inputType];
    const confirmed = userInputForTrip?.[inputType];
    const inferred = finalInference && Object.values(finalInference).some((o) => o);
    if (inferred && !confirmed) someInferred = true;
    if (!confirmed) allConfirmed = false;
  }
  return someInferred ? 'can-verify' : allConfirmed ? 'already-verified' : 'cannot-verify';
}

export function inferFinalLabels(trip: CompositeTrip, userInputForTrip?: UserInputMap) {
  // Deep copy the possibility tuples
  let labelsList: InferredLabels = [];
  if (trip.inferred_labels) {
    labelsList = JSON.parse(JSON.stringify(trip.inferred_labels));
  }

  // Capture the level of certainty so we can reconstruct it later
  const totalCertainty = labelsList.map((item) => item.p).reduce((item, rest) => item + rest, 0);

  // Filter out the tuples that are inconsistent with existing green labels
  for (const inputType of getLabelInputs()) {
    const userInput = userInputForTrip?.[inputType];
    if (userInput) {
      const retKey = inputType2retKey(inputType);
      labelsList = labelsList.filter((item) => item.labels[retKey] == userInput.data.label);
    }
  }

  const finalInference: { [k in MultilabelKey]?: LabelOption } = {};

  // Return early with (empty obj) if there are no possibilities left
  if (labelsList.length == 0) {
    return finalInference;
  } else {
    // Normalize probabilities to previous level of certainty
    const certaintyScalar =
      totalCertainty / labelsList.map((item) => item.p).reduce((item, rest) => item + rest);
    labelsList.forEach((item) => (item.p *= certaintyScalar));

    for (const inputType of getLabelInputs()) {
      // For each label type, find the most probable value by binning by label value and summing
      const retKey = inputType2retKey(inputType);
      let valueProbs = new Map();
      for (const tuple of labelsList) {
        const labelValue = tuple.labels[retKey];
        if (!valueProbs.has(labelValue)) valueProbs.set(labelValue, 0);
        valueProbs.set(labelValue, valueProbs.get(labelValue) + tuple.p);
      }
      let max = { p: 0, labelValue: undefined };
      for (const [thisLabelValue, thisP] of valueProbs) {
        // In the case of a tie, keep the label with earlier first appearance in the labelsList (we used a Map to preserve this order)
        if (thisP > max.p) max = { p: thisP, labelValue: thisLabelValue };
      }

      // Display a label as red if its most probable inferred value has a probability less than or equal to the trip's confidence_threshold
      // Fails safe if confidence_threshold doesn't exist
      if (max.p <= trip.confidence_threshold) max.labelValue = undefined;

      if (max.labelValue) {
        finalInference[inputType] = labelOptionByValue(max.labelValue, inputType);
      }
    }
    return finalInference;
  }
}
