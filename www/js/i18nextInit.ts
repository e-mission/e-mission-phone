/* Initializes i18next with en, es, fr, and it translations, and uses the language
    detected by the browser with en as a fallback.
  Exports the initialized instance of i18next. */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../i18n/en.json';
import es from '../../locales/es/i18n/es.json';
import fr from '../../locales/fr/i18n/fr.json';
import it from '../../locales/it/i18n/it.json';
const langs = { en, es, fr, it };

let resources = {};
for (const [lang, json] of Object.entries(langs)) {
  resources[lang] = { translation: json }
}

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
    resources,
    lng: detectedLang,
    fallbackLng: 'en'
  });

export default i18next;
