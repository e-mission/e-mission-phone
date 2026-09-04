/* Initializes i18next with en, es, fr, and it translations, and uses the language
    detected by the browser with en as a fallback.
  Exports the initialized instance of i18next. */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DeploymentConfigWithOverrides, TranslationTree } from './types/appConfigTypes';

/* How should we handle missing translations?

Before this change, if a translation was missing, the translation would fail silently
  and the raw key would show up in the UI.
With this implementation, if a translation is missing, a warning is logged to the console
  and the key is replaced with the translation from the fallback language (English).
On dev builds, the fallback translation is prefixed with a globe emoji so it's easy to spot
  and we can fix it. On prod builds, we'll just show the English string. */

/* any strings defined in fallbackLang but not in lang will be merged into lang, recursively */
function mergeInTranslations(lang, fallbackLang) {
  Object.entries(fallbackLang).forEach(([key, value]) => {
    if (lang[key] === undefined) {
      logWarn(`Missing translation for key '${key}'`);
      if (__DEV__) {
        if (typeof value === 'string') {
          lang[key] = `🌐${value}`;
        } else if (typeof value === 'object' && typeof lang[key] === 'object') {
          lang[key] = {};
          mergeInTranslations(lang[key], value);
        }
      } else {
        lang[key] = value;
      }
    } else if (typeof value === 'object' && typeof lang[key] === 'object') {
      mergeInTranslations(lang[key], fallbackLang[key]);
    }
  });
  return lang;
}

import enJson from '../i18n/en.json';
import esJson from '../../locales/es/i18n/es.json';
/* the built-in translations, before any deployment config overrides are applied */
const baseTranslations: { [lang: string]: TranslationTree } = {
  en: enJson as TranslationTree,
  es: mergeInTranslations(esJson, enJson) as TranslationTree,
};
const langs = {
  en: { translation: baseTranslations.en },
  es: { translation: baseTranslations.es },
};

/* warns about override keys that don't exist in the built-in translations, which are
  almost always typos since they would silently have no effect */
function warnOnUnknownKeys(overrides: TranslationTree, base: TranslationTree, path = '') {
  Object.entries(overrides).forEach(([key, value]) => {
    const keyPath = path ? `${path}.${key}` : key;
    if (base[key] === undefined) {
      logWarn(`Deployment config overrides unknown translation key '${keyPath}'`);
    } else if (typeof value === 'object' && typeof base[key] === 'object') {
      warnOnUnknownKeys(value, base[key] as TranslationTree, keyPath);
    }
  });
}

/**
 * @description Applies the `translation_overrides` from a deployment config on top of the
 *  built-in translations. Only the languages given in the config are overridden; every other
 *  language, and every key not mentioned, keeps its built-in value.
 */
export function applyConfigTranslations(config?: DeploymentConfigWithOverrides | null) {
  const overrides = config?.translation_overrides;
  Object.keys(baseTranslations).forEach((lang) => {
    /* a deep addResourceBundle mutates the bundle in place, so drop the existing bundle and start
      from a copy of the built-in translations; otherwise overrides from a previously loaded
      deployment config would stick around */
    const base = JSON.parse(JSON.stringify(baseTranslations[lang]));
    i18next.removeResourceBundle(lang, 'translation');
    i18next.addResourceBundle(lang, 'translation', base, false, true);
    if (overrides?.[lang]) {
      // always validate against English, which is the complete set of keys
      warnOnUnknownKeys(overrides[lang], baseTranslations.en);
      i18next.addResourceBundle(lang, 'translation', overrides[lang], true, true);
    }
  });
}

const locales = navigator?.languages?.length ? navigator.languages : [navigator.language];
let detectedLang;
for (const locale of locales) {
  const lang = locale.trim().split(/-|_/)[0];
  if (Object.keys(langs).includes(lang)) {
    detectedLang = lang;
    break; // once we find a supported language, stop looking
  }
}

i18next.use(initReactI18next).init({
  debug: true,
  resources: langs,
  lng: detectedLang,
  fallbackLng: 'en',
});

export default i18next;

// Next, register the translations for react-native-paper-dates
import { en, es, registerTranslation } from 'react-native-paper-dates';
import { logWarn } from './plugin/logger';
const rnpDatesLangs = {
  en,
  es,
};
for (const lang of Object.keys(rnpDatesLangs)) {
  registerTranslation(lang, rnpDatesLangs[lang]);
}
