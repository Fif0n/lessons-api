const en = require('../locales/en.json');
const pl = require('../locales/pl.json');

const translations = { en, pl };
const defaultLanguage = 'en';
const supportedLanguages = ['en', 'pl'];

/**
 * Get translated string by key and language
 * @param {string} key - Dot-notation key (e.g., 'auth.loginSuccess')
 * @param {string} language - Language code ('en' or 'pl')
 * @returns {string} - Translated string or key if not found
 */
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
