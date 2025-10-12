const express = require('express');
const authController = require('../controllers/authController');
const { roles } = require('../enums/userEnums');
const ratingController = require('../controllers/ratingController');

const router = express.Router();

router.use(authController.protect);

router.route('/rate')
    .post(
        authController.restrictTo(roles.student),
        ratingController.postRate
    );

router.route('/rate/:id')
    .put(
        authController.restrictTo(roles.student),
        ratingController.updateRate
    );

module.exports = router;