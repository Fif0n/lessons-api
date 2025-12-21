const AppError = require('./appError');
const { t } = require('./i18n');

const handleDuplicateFields = (err, language = 'en') => {
    const data = {};
    const field = Object.keys(err.errorResponse.keyValue)[0];

    data[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} ${t('errors.alreadyInUse', language)}`;
    const message = 'ValidationError';

    return new AppError(message, 400, { data });
};

const handleValidationError = (err, language = 'en') => {
    const data = {};

    Object.keys(err.errors).forEach((key) => {
        const rawMessage = err.errors[key].message;
        // Translate if message is a translation key; otherwise return original message
        data[key] = typeof rawMessage === 'string' ? t(rawMessage, language) : rawMessage;
    });

    const message = 'ValidationError';

    return new AppError(message, 400, { data });
};

const handleError = (err, res, language = 'en') => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            data: err.data
        });
    } else {
        console.error('Error', err);

        res.status(500).json({
            status: 'error',
            message: t('errors.somethingWentWrongExclamation', language),
        });
    }
}

const handleInsideValidation = err => {
    return new AppError('ValidationError', 400, err.data)
}

module.exports = (err, req, res, next) => {
    console.log(err);
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    err.message = err.message || 'error';

    let error = { ...err, message: err.message };
    const language = req.language || 'en';

    if (err.code === 11000) error = handleDuplicateFields(err, language);
    if (err.name === 'ValidationError') error = handleValidationError(err, language);
    if (err.message === 'ValidationError') error = handleInsideValidation(err);

    handleError(error, res, language);
}