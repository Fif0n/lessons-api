const Conversation = require("../models/Conversation");
const User = require("../models/User");
const AppError = require("../utils/appError");
const catchErrorAsync = require("../utils/catchErrorAsync");
const LessonRequest = require('../models/LessonRequest');
const { t } = require('../utils/i18n');

exports.getConversations = catchErrorAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const skip = (page - 1) * perPage;

    const { id } = req.query;
    const query = {};

    if (id && id.length > 0) {
        query.idSearch = id;
    }

    const lessonRequests = await LessonRequest.find({
        $or: [
            { student: user._id },
            { teacher: user._id }
        ]
    }).select('_id');

    const lessonRequestIds = lessonRequests.map(lr => lr._id);

    if (lessonRequestIds.length === 0) {
        return res.status(200).json([]);
    }

    query.lessonRequest = { $in: lessonRequestIds };

    const conversations = await Conversation.find(query)
        .populate({
            path: 'lessonRequest',
            select: 'student teacher'
        })
        .sort({ timestamps: -1 })
        .skip(skip)
        .limit(perPage);

    res.status(200).json(conversations);
});

exports.getConversation = catchErrorAsync(async (req, res, next) => {
    const conversation = await Conversation.findById(req.params.id);

    if (conversation) {
        conversation.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    res.status(200).json({
        status: 'success',
        data: {
            conversation
        }
    });
});

exports.sendMessage = catchErrorAsync(async (req, res, next) => {
    const conversation = await Conversation.findById(req.params.id);
    const user = await User.findById(req.user.id);

    const { message } = req.body;

    if (!(conversation.lessonRequest.student._id.equals(user._id) || conversation.lessonRequest.teacher._id.equals(user._id))) {
        return next(
            new AppError(
                t('conversation.notBelongToConversation', req.language || 'en'),
                403,
            )
        );
    }

    const messages = conversation.messages;
    messages.push({
        user,
        messageText: message
    });

    conversation.messages = messages;
    await conversation.save();

    res.status(201).json({
        status: 'success',
        data: {
            conversation
        }
    });
});