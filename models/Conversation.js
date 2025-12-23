const mongoose = require('mongoose');
const dateHelper = require('../utils/dateHelper');

const conversationSchema = mongoose.Schema(
    {
        lessonRequest: {
            type: mongoose.Schema.ObjectId,
            ref: 'LessonRequest',
            required: [true, 'validation.conversation.lessonRequestRequired']
        },
        messages: [
            {
                user: {
                    type: mongoose.Schema.ObjectId,
                    ref: 'User',
                    required: [true, 'validation.conversation.userRequired'],
                },
                messageText: {
                    type: String,
                    required: [true, 'validation.conversation.messageRequired']
                },
                timestamp: {
                    type: String,
                    default: () => {
                        const now = new Date();
                        return dateHelper.getHumanTimestamp(now);
                    },
                }
            },
        ],
        createdAtAsString: {
            type: String,
            default: () => {
                const now = new Date();
                return dateHelper.getHumanTimestamp(now);
            },
        }
    },
    { timestamps: true }
);

conversationSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'messages.user',
        select: 'name surname'
    }).populate({
        path: 'lessonRequest',
        select: 'student teacher'
    });

    next();
});

conversationSchema.pre('save', function (next) {
    this.idSearch = this._id.toString();

    next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;