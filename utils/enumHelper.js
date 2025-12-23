const { t } = require('./i18n');

const translateEnumValue = (enumObj, key, language = 'en') => {
    if (!enumObj[key]) return key;
    return t(enumObj[key], language || 'en');
};

const translateEnumObject = (enumObj, language = 'en') => {
    const translated = {};
    Object.keys(enumObj).forEach(key => {
        translated[key] = t(enumObj[key], language || 'en');
    });
    return translated;
};

module.exports = { translateEnumValue, translateEnumObject };
