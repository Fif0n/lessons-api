const en = require('../locales/en.json');
const pl = require('../locales/pl.json');

const translations = { en, pl };
const defaultLanguage = 'en';
const supportedLanguages = ['en', 'pl'];

const t = (key, language = defaultLanguage) => {
  const lang = supportedLanguages.includes(language) ? language : defaultLanguage;
  const keys = key.split('.');
  let value = translations[lang];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
};

module.exports = { t, supportedLanguages, defaultLanguage };
