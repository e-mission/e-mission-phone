// may refactor this into a React hook once it's no longer used by any Angular screens

import { getAngularService } from "../../angular-react-helper";
import { fetchUrlCached } from "../../commHelper";
import i18next from "i18next";
import { logDebug } from "../../plugin/logger";

type InputDetails<T extends string> = {
  [k in T]?: {
    name: string,
    labeltext: string,
    choosetext: string,
    key: string,
  }
};
type LabelOptions<T extends string = 'MODE'|'PURPOSE'|'REPLACED_MODE'> = {
  [k in T]: {
    key: string,
    met?: {range: any[], mets: number}
    met_equivalent: string,
    co2PerMeter: number,
  }
} & { translations: {
  [lang: string]: { [translationKey: string]: string }
}};

let appConfig;
let labelOptions: LabelOptions<'MODE'|'PURPOSE'|'REPLACED_MODE'>;
let inputDetails: InputDetails<'MODE'|'PURPOSE'|'REPLACED_MODE'>;

export async function getLabelOptions(appConfigParam?) {
  if (appConfigParam) appConfig = appConfigParam;
  if (labelOptions) return labelOptions;

  if (appConfig.label_options) {
    const labelOptionsJson = await fetchUrlCached(appConfig.label_options);
    labelOptions = JSON.parse(labelOptionsJson) as LabelOptions;
    /* fill in the translations to the 'text' fields of the labelOptions,
      according to the current language */
    const lang = i18next.language;
    for (const opt in labelOptions) {
      const translationKey = labelOptions[opt].key;
      const translation = labelOptions.translations[lang][translationKey];
      labelOptions[opt].text = translation;
    }
  } else {
    // backwards compat: if dynamic config doesn't have label_options, use the old way
    const i18nUtils = getAngularService("i18nUtils");
    const optionFileName = await i18nUtils.geti18nFileName("json/", "trip_confirm_options", ".json");
    try {
      const optionFile = await fetchUrlCached(optionFileName);
      labelOptions = JSON.parse(optionFile) as LabelOptions;
    } catch (e) {
      logDebug("error "+JSON.stringify(e)+" while reading confirm options, reverting to defaults");
      const optionFile = await fetchUrlCached("json/trip_confirm_options.json.sample");
      labelOptions = JSON.parse(optionFile) as LabelOptions;
    }
  }
  return labelOptions;
}

export const baseLabelInputDetails = {
  MODE: {
    name: "MODE",
    labeltext: "diary.mode",
    choosetext: "diary.choose-mode",
    key: "manual/mode_confirm",
  },
  PURPOSE: {
    name: "PURPOSE",
    labeltext: "diary.purpose",
    choosetext: "diary.choose-purpose",
    key: "manual/purpose_confirm",
  },
}

export function getLabelInputDetails(appConfigParam?) {
  if (appConfigParam) appConfig = appConfigParam;
  if (inputDetails) return inputDetails;

  if (appConfig.intro.program_or_study != 'program') {
    // if this is a study, just return the base input details
    return baseLabelInputDetails;
  }
  // else this is a program, so add the REPLACED_MODE
  inputDetails = { ...baseLabelInputDetails,
    REPLACED_MODE: {
      name: "REPLACED_MODE",
      labeltext: "diary.replaces",
      choosetext: "diary.choose-replaced-mode",
      key: "manual/replaced_mode",
    }
  };
  return inputDetails;
}

export const getLabelInputs = () => Object.keys(getLabelInputDetails());
export const getBaseLabelInputs = () => Object.keys(baseLabelInputDetails);

const otherValueToText = (otherValue) => {
  const words = otherValue.replace("_", " ").split(" ");
  if (words.length == 0) return "";
  return words.map((word) =>
    word[0].toUpperCase() + word.slice(1)
  ).join(" ");
}

const otherTextToValue = (otherText) =>
  otherText.toLowerCase().replace(" ", "_");

export const getFakeEntry = (otherValue) => ({
  text: otherValueToText(otherValue),
  value: otherValue,
});
