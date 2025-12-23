const express = require('express');
const lessonRequestController = require('../controllers/lessonRequestController');
const authController = require('../controllers/authController');
const { roles } = require('../enums/userEnums');

const router = express.Router();

router.use(authController.protect);

router.route('/lesson-requests')
    .get(
        lessonRequestController.getLessonRequests
    );

router.route('/lesson-requests-enums')
    .get(
        lessonRequestController.getLessonRequestStatuses
    );

router.route('/lessons-history-enums')
    .get(
        lessonRequestController.getLessonsHistoryEnums
    );

router.route('/lesson-request/:id')
    .get(
        lessonRequestController.getLessonRequest
    )
    .post(
        lessonRequestController.postLessonRequest
    );

router.route('/set-lesson-link/:id')
    .put(
        authController.restrictTo('teacher'),
        lessonRequestController.setLessonLink
    );

router.route('/incoming-lessons/:year/:week')
    .get(
        lessonRequestController.getIncomingLessons
    );

router.route('/history')
    .get(
        lessonRequestController.getLessonsHistory
    );

module.exports = router;
