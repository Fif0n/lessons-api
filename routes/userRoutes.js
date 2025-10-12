const express = require('express');
const authController = require('./../controllers/authController');
const userController = require('./../controllers/userController');
const teacherController = require('./../controllers/teacherController');
const { check } = require('express-validator');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { roles } = require('../enums/userEnums');
const multer = require('multer');

const router = express.Router();

router.use(authController.protect);

router
    .route('/user-data')
    .put(
        check('email')
            .isEmail()
            .withMessage('Invalid Email')
            .withMessage('Email is required')
            .custom(async value => {
                const existingUser = await User.findOne({
                    email: value,
                    _id: { $ne: req.user.id }
                });
                if (existingUser) throw new AppError('Email already in use');
            }),
        userController.updateProfileSettings
    )
    .get(userController.getUserData);

router.put(
    '/update-password',
    check('currentPassword')
        .notEmpty()
        .withMessage('Current password cannot be empty'),
    check('password')
        .notEmpty()
        .withMessage('New password cannot be empty'),
    check('passwordConfirm')
        .notEmpty()
        .withMessage('Confirm password cannot be empty'),
    authController.updatePassword
);

router
    .route('/lesson-settings')
    .get(
        userController.getLessonsSettings
    )
    .put(
        authController.restrictTo(roles.teacher),
        userController.updateLessonsSettings
    );


router
    .route('/available-hours')
    .put(
        authController.restrictTo(roles.teacher),
        userController.updateAvailableHours
    )
    .get(
        authController.restrictTo(roles.teacher),
        userController.getAvailableHours
    );

router.get('/profile-data', authController.restrictTo(roles.teacher), userController.getProfileData);

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

router.post('/upload-avatar', upload.single('image'), userController.uploadUserAvatar);

router.get('/get-avatar', userController.getUserAvatar);

router.route('/opinions-about-me')
    .get(
        authController.restrictTo(roles.teacher),
        teacherController.getTeacherRatings
    );

router.route('/estimated-income')
    .get(
        authController.restrictTo(roles.teacher),
        userController.getEsitimatedIncome,
    );

module.exports = router;
