const { validationResult } = require('express-validator');
const { t } = require('./i18n');

const validator = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const language = req.language || 'en';
        const error = {};

        errors.array().forEach(err => {
            const raw = err.msg;
            error[err.path] = typeof raw === 'string' ? t(raw, language) : raw;
        });

        return res.status(422).json({
            status: 'fail',
            message: 'ValidationError',
            data: error
        });
    }
    next();
};

module.exports = validator;