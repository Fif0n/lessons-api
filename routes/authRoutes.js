const express = require('express');
const { check } = require('express-validator');
const validator = require('./../utils/validator');
const { roles } = require('../enums/userEnums');
const authController = require('./../controllers/authController');
const User = require('../models/User');

const router = express.Router();

router.post(
    '/signup',
    check('email')
        .isEmail()
        .withMessage('validation.emailIncorrect')
        .notEmpty()
        .withMessage('validation.emailRequired')
        .custom(async (value, { req }) => {
            const user = await User.findOne({email: value});
            if (user) throw new Error('auth.emailAlreadyExists');
        })
        .normalizeEmail(),
    check('password')
        .notEmpty()
        .withMessage('validation.passwordRequired')
        .isLength({ min: 6 })
        .withMessage('validation.passwordMinLength'),
    check('passwordConfirm')
        .notEmpty()
        .withMessage('validation.passwordConfirmRequired')
        .custom((value, { req }) => {
            return value === req.body.password
        })
        .withMessage('validation.passwordsNotSame'),
    check('name')
        .notEmpty()
        .withMessage('validation.nameRequired'),
    check('surname')
        .notEmpty()
        .withMessage('validation.surnameRequired'),
    check('role')
        .isIn(['student', 'teacher'])
        .withMessage('validation.incorrectRole'),
    validator,
    authController.signup
);

router.post(
    '/login',
    check('email')
        .notEmpty()
        .withMessage('validation.emailRequired'),
    check('password')
        .notEmpty()
        .withMessage('validation.passwordRequired'),
    check('role')
        .isIn(['student', 'teacher'])
        .withMessage('validation.incorrectRole'),
    validator,
    authController.login
);

module.exports = router;