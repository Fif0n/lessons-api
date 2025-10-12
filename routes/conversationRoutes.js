const express = require('express');
const conversationController = require('../controllers/conversationController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.route('/conversations')
    .get(
        conversationController.getConversations
    );

router.route('/conversation/:id')
    .get(
        conversationController.getConversation
    );

router.route('/send-message/:id')
    .post(
        conversationController.sendMessage
    );

module.exports = router;