/* Initializes i18next with en, es, fr, and it translations, and uses the language
    detected by the browser with en as a fallback.
  Exports the initialized instance of i18next. */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

/* How should we handle missing translations?

Before this change, if a translation was missing, the translation would fail silently
  and the raw key would show up in the UI.
With this implementation, if a translation is missing, a warning is logged to the console
  and the key is replaced with the translation from the fallback language (English).
On dev builds, the fallback translation is prefixed with a globe emoji so it's easy to spot
  and we can fix it. On prod builds, we'll just show the English string. */

/* any strings defined in fallbackLang but not in lang will be merged into lang, recursively */
const mergeInTranslations = (lang, fallbackLang) => {
  Object.entries(fallbackLang).forEach(([key, value]) => {
    if (lang[key] === undefined) {
      console.warn(`Missing translation for key '${key}'`);
      if (__DEV__) {
        if (typeof value === 'string') {
          lang[key] = `🌐${value}`
        } else if (typeof value === 'object') {
          lang[key] = {};
          mergeInTranslations(lang[key], value);
        }
      } else {
        lang[key] = value;
      }
    } else if (typeof value === 'object') {
      mergeInTranslations(lang[key], fallbackLang[key])
    }
  });
  return lang;
}

import enJson from '../i18n/en.json';
import esJson from '../../locales/es/i18n/es.json';
import frJson from '../../locales/fr/i18n/fr.json';
import itJson from '../../locales/it/i18n/it.json';
const langs = {
  en: { translation: enJson },
  es: { translation: mergeInTranslations(esJson, enJson) },
  fr: { translation: mergeInTranslations(frJson, enJson) },
  it: { translation: mergeInTranslations(itJson, enJson) }
};

const locales = navigator?.languages?.length ? navigator.languages : [navigator.language];
let detectedLang;
locales.forEach(locale => {
  const lang = locale.trim().split(/-|_/)[0];
  if (Object.keys(langs).includes(lang)) {
    detectedLang = lang;
  }
});

i18next.use(initReactI18next)
  .init({
    debug: true,
    resources: langs,
    lng: detectedLang,
    fallbackLng: 'en'
  });

export default i18next;
