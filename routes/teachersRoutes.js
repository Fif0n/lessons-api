const express = require('express');
const authController = require('./../controllers/authController');
const teacherController = require('./../controllers/teacherController');
const { roles } = require('../enums/userEnums');

const router = express.Router();

router.use(authController.protect);

router.route('/teachers')
    .get(
        authController.restrictTo(roles.student),
        teacherController.getTeacherList
    );

router.route('/teacher/:id')
    .get(
        authController.restrictTo(roles.student),
        teacherController.getTeacherData,
    );

router.route('/available-lesson-requests-hours/:id/:date')
    .get(
        authController.restrictTo(roles.student),
        teacherController.getActiveRequests,
    );

router.route('/lesson-request/:id')
    .post(
        authController.restrictTo(roles.student),
        teacherController.sendLessonRequest,
    );

router.route('/ratings/:id')
    .get(
        teacherController.getTeacherRatings
    );

module.exports = router;