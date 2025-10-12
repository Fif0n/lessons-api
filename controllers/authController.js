
const User = require('./../models/User');
const catchErrorAsync = require('../utils/catchErrorAsync');
const AppError = require('../utils/appError');
const { promisify } = require('util');
const { signJwtToken, saveTokenOptionsToCookies } = require('../auth/tokenManager');
const jwt = require('jsonwebtoken');

const createAndSendToken = (user, status, res) => {
    const token = signJwtToken(user);
    saveTokenOptionsToCookies(token, res);

    // Nie chcemy zwracać hasła w odpowiedzi
    user.password = undefined;

    res.status(status).json({
        status: 'success',
        message: 'Successfully authorized',
        token,
        data: { user }
    });
}

exports.signup = catchErrorAsync(async (req, res, next) => {
    const { email, password, passwordConfirm, name, surname, role } = req.body;

    const newUser = await User.create({
        email,
        password,
        passwordConfirm,
        name, 
        surname,
        role
    });

    createAndSendToken(newUser, 201, res);
});

exports.login = catchErrorAsync(async (req, res, next) => {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email, role }).select('+password');

    if (!user || !(await user.isPasswordCorrect(password, user.password))) {
        const errorMessage = 'Invalid email or password';
        return next(new AppError('ValidationError', 422, {
            email: errorMessage,
            password: errorMessage
        }));
    }

    createAndSendToken(user, 200, res);
});

exports.protect = catchErrorAsync(async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(
            new AppError(
                'You are not logged in! Please log in to get access',
                401,
            ),
        );
    }

    // Weryfikacja i deszyfrowanie tokenu
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Sprawdzanie, czy użytkownik nadal istnieje w bazie
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(
            new AppError(
                'The user belonging to this token no longer exist.',
                401,
            ),
        );
    }

    // Sprawdzanie, czy użytkownik nie zmienił hasła, po utworzeniu tokenu
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                'User recently changed password! Please log in again.',
                401,
            ),
        );
    }

    req.user = currentUser;
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError('You are not permitted to do this action', 403)
            );
        }
    
        next();
    };
}

exports.updatePassword = catchErrorAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
        return next(new AppError('User not found', 400));
    }

    if (!await user.isPasswordCorrect(req.body.currentPassword, user.password)) {
        return next(new AppError('ValidationError', 400, { data: {
            currentPassword: 'Current password is not correct',
        }}));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    createAndSendToken(user, 200, res);
})