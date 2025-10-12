const AppError = require('./appError');

const handleDuplicateFields = err => {
    const data = {};
    const field = Object.keys(err.errorResponse.keyValue)[0];

    data[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use`;
    const message = 'ValidationError';

    return new AppError(message, 400, { data });
};

const handleValidationError = err => {
    const data = {};

    Object.keys(err.errors).forEach((key) => {
        data[key] = err.errors[key].message;
    });

    const message = 'ValidationError';

    return new AppError(message, 400, { data });
};

const handleError = (err, res) => {
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
            message: 'Something went wrong!',
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

    if (err.code === 11000) error = handleDuplicateFields(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);
    if (err.message === 'ValidationError') error = handleInsideValidation(err);

    handleError(error, res);
}