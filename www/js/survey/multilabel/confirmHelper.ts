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
export type LabelOptions<T extends string = 'MODE'|'PURPOSE'|'REPLACED_MODE'> = {
  [k in T]: {
    value: string,
    baseMode: string,
    met?: {range: any[], mets: number}
    met_equivalent?: string,
    kgCo2PerKm: number,
    text?: string,
  }[]
} & { translations: {
  [lang: string]: { [translationKey: string]: string }
}};

let appConfig;
export let labelOptions: LabelOptions<'MODE'|'PURPOSE'|'REPLACED_MODE'>;
export let inputDetails: InputDetails<'MODE'|'PURPOSE'|'REPLACED_MODE'>;

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
      labelOptions[opt]?.forEach?.((o, i) => {
        const translationKey = o.value;
        const translation = labelOptions.translations[lang][translationKey];
        labelOptions[opt][i].text = translation;
      });
    }
  } else {
    // backwards compat: if dynamic config doesn't have label_options, use the old way
    const i18nUtils = getAngularService("i18nUtils");
    const optionFileName = await i18nUtils.geti18nFileName("json/", "trip_confirm_options", ".json");
    try {
      const optionJson = await fetch(optionFileName).then(r => r.json());
      labelOptions = optionJson as LabelOptions;
    } catch (e) {
      logDebug("error "+JSON.stringify(e)+" while reading confirm options, reverting to defaults");
      const optionJson = await fetch("json/trip_confirm_options.json.sample").then(r => r.json());
      labelOptions = optionJson as LabelOptions;
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

  if (!appConfig.intro.mode_studied) {
    /* If there is no mode of interest, we don't need REPLACED_MODE.
      So just return the base input details. */
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

/** @description replace all underscores with spaces, and capitalizes the first letter of each word */
export const labelKeyToReadable = (otherValue: string) => {
  const words = otherValue.replace(/_/g, " ").trim().split(" ");
  if (words.length == 0) return "";
  return words.map((word) =>
    word[0].toUpperCase() + word.slice(1)
  ).join(" ");
}

/** @description replaces all spaces with underscores, and lowercases the string */
export const readableLabelToKey = (otherText: string) =>
  otherText.trim().replace(/ /g, "_").toLowerCase();

export const getFakeEntry = (otherValue) => ({
  text: labelKeyToReadable(otherValue),
  value: otherValue,
});

export const labelKeyToRichMode = (labelKey: string) =>
  labelOptions?.MODE?.find(m => m.value == labelKey)?.text || labelKeyToReadable(labelKey);
