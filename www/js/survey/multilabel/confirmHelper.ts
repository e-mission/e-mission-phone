// may refactor this into a React hook once it's no longer used by any Angular screens

import { fetchUrlCached } from '../../services/commHelper';
import i18next from 'i18next';
import { logDebug } from '../../plugin/logger';
import { LabelOption, LabelOptions, MultilabelKey, InputDetails } from '../../types/labelTypes';

let appConfig;
export let labelOptions: LabelOptions<MultilabelKey>;
export let inputDetails: InputDetails<MultilabelKey>;

export async function getLabelOptions(appConfigParam?) {
  if (appConfigParam) appConfig = appConfigParam;
  if (labelOptions) return labelOptions;
  if (appConfig.label_options) {
    const labelOptionsJson = await fetchUrlCached(appConfig.label_options);
    logDebug(
      'label_options found in config, using dynamic label options at ' + appConfig.label_options,
    );
    labelOptions = JSON.parse(labelOptionsJson) as LabelOptions;
  } else {
    const defaultLabelOptionsURL = 'json/label-options.json.sample';
    logDebug(
      'No label_options found in config, using default label options at ' + defaultLabelOptionsURL,
    );
    const defaultLabelOptionsJson = await fetchUrlCached(defaultLabelOptionsURL);
    labelOptions = JSON.parse(defaultLabelOptionsJson) as LabelOptions;
  }
  /* fill in the translations to the 'text' fields of the labelOptions,
    according to the current language */
  const lang = i18next.language;
  for (const opt in labelOptions) {
    labelOptions[opt]?.forEach?.((o, i) => {
      const translationKey = o.value;
      // If translation exists in labelOptions, use that. Otherwise, use the one in the i18next. If there is not "translations" field in labelOptions, defaultly use the one in the i18next.
      const translation = labelOptions.translations
        ? labelOptions.translations[lang][translationKey] ||
          i18next.t(`multilabel.${translationKey}`)
        : i18next.t(`multilabel.${translationKey}`);
      labelOptions[opt][i].text = translation;
    });
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
    if (userInputForTrip?.['MODE']?.value == appConfig.intro.mode_studied) {
      logDebug(
        'Found trip labeled with mode of study ' +
          appConfig.intro.mode_studied +
          '. Needs REPLACED_MODE',
      );
      return getLabelInputDetails();
    } else {
      logDebug(
        'Found trip not labeled with mode of study ' +
          appConfig.intro.mode_studied +
          ". Doesn't need REPLACED_MODE",
      );
      return baseLabelInputDetails;
    }
  } else {
    logDebug('No mode of study, so there is no REPLACED_MODE label option');
    return getLabelInputDetails();
  }
}

export const getLabelInputs = () => Object.keys(getLabelInputDetails());
export const getBaseLabelInputs = () => Object.keys(baseLabelInputDetails);

/** @description replace all underscores with spaces, and capitalizes the first letter of each word */
export const labelKeyToReadable = (otherValue: string) => {
  const words = otherValue.replace(/_/g, ' ').trim().split(' ');
  if (words.length == 0) return '';
  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
};

/** @description replaces all spaces with underscores, and lowercases the string */
export const readableLabelToKey = (otherText: string) =>
  otherText.trim().replace(/ /g, '_').toLowerCase();

export const getFakeEntry = (otherValue): Partial<LabelOption> => {
  if (!otherValue) return undefined;
  return {
    text: labelKeyToReadable(otherValue),
    value: otherValue,
  };
};

export const labelKeyToRichMode = (labelKey: string) =>
  labelOptionByValue(labelKey, 'MODE')?.text || labelKeyToReadable(labelKey);

/* manual/mode_confirm becomes mode_confirm */
export const inputType2retKey = (inputType) => getLabelInputDetails()[inputType].key.split('/')[1];

export function verifiabilityForTrip(trip, userInputForTrip) {
  let allConfirmed = true;
  let someInferred = false;
  const inputsForTrip = Object.keys(labelInputDetailsForTrip(userInputForTrip));
  for (const inputType of inputsForTrip) {
    const finalInference = inferFinalLabels(trip, userInputForTrip)[inputType];
    const confirmed = userInputForTrip[inputType];
    const inferred = finalInference && Object.values(finalInference).some((o) => o);
    if (inferred && !confirmed) someInferred = true;
    if (!confirmed) allConfirmed = false;
  }
  return someInferred ? 'can-verify' : allConfirmed ? 'already-verified' : 'cannot-verify';
}

export function inferFinalLabels(trip, userInputForTrip) {
  // Deep copy the possibility tuples
  let labelsList = [];
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
      labelsList = labelsList.filter((item) => item.labels[retKey] == userInput.value);
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
