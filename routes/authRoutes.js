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
        .withMessage('Invalid Email')
        .notEmpty()
        .withMessage('Email is required')
        .custom(async (value, { req }) => {
            const user = await User.findOne({email: value});
            if (user) throw new AppError('Email already in use');
        })
        .normalizeEmail(),
    check('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password has to be minimum 6 chars long'),
    check('passwordConfirm')
        .notEmpty()
        .withMessage('Password confirmation is required')
        .custom((value, { req }) => {
            return value === req.body.password
        })
        .withMessage('Passwords are not the same'),
    check('name')
        .notEmpty()
        .withMessage('Name is required'),
    check('surname')
        .notEmpty()
        .withMessage('Surname is required'),
    check('role')
        .isIn([roles.student, roles.teacher])
        .withMessage('Passed incorrect role'),
    validator,
    authController.signup
);

router.post(
    '/login',
    check('email')
        .notEmpty()
        .withMessage('Email is required'),
    check('password')
        .notEmpty()
        .withMessage('Password is required'),
    check('role')
        .isIn([roles.student, roles.teacher])
        .withMessage('Passed incorrect role'),
    validator,
    authController.login
);

module.exports = router;