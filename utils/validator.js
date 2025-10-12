const { validationResult } = require('express-validator');

const validator = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        let error = {};

        errors.array().map(err => (error[err.path] = err.msg));
        return res.status(422).json({
            status: 'fail',
            message: 'ValidationError',
            data: error
        });
    }
    next();
};

module.exports = validator;