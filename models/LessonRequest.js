const mongoose = require('mongoose');
const { status } = require('../enums/lessonRequestEnums');
const { subjects, schoolLevels, lessonPlaces } = require('../enums/userEnums');
const dateHelper = require('../utils/dateHelper');

const lessonRequestSchema = mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'validation.lessonRequest.studentRequired'],
        },
        teacher: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'validation.lessonRequest.teacherRequired'],
        },
        date: {
            type: Date,
            required: [true, 'validation.lessonRequest.dateRequired'],
        },
        hours: {
            startingHour: {
                hour: {
                    type: Number,
                    required: [true, 'validation.lessonRequest.startingHourRequired'],
                    mix: 1,
                    max: 24,
                },
                minute: {
                    type: Number,
                    required: [true, 'validation.lessonRequest.startingHourRequired'],
                    mix: 0,
                    max: 60,
                }
            },
            endingHour: {
                hour: {
                    type: Number,
                    required: [true, 'validation.lessonRequest.endingHourRequired'],
                    mix: 1,
                    max: 23,
                },
                minute: {
                    type: Number,
                    required: [true, 'validation.lessonRequest.endingHourRequired'],
                    mix: 0,
                    max: 59,
                }
            }
        },
        comment: String,
        moneyRate: {
            type: Number,
            required: [true, 'validation.lessonRequest.lessonCostRequired']
        },
        status: {
            type: String,
            default: 'pending',
            enum: Object.keys(status)
        },
        subject: {
            type: String,
            enum: Object.keys(subjects),
            required: [true, 'validation.lessonRequest.subjectRequired']
        },
        schoolLevel: {
            type: String,
            enum: Object.keys(schoolLevels),
            required: [true, 'validation.lessonRequest.schoolLevelRequired']
        },
        lessonPlace: {
            type: String,
            enum: Object.keys(lessonPlaces),
            required: [true, 'validation.lessonRequest.lessonPlaceRequired']
        },
        onlineLessonLink: String,
        idSearch: String,
    },
    { timestamps: true }
);

lessonRequestSchema.virtual('dateFormatted').get(function () {
    return this.date ? dateHelper.getHumanDate(this.date) : undefined;
});

lessonRequestSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'student',
        select: 'name surname email'
    }).populate({
        path: 'teacher',
        select: 'name surname email'
    });

    this.statusName = status[this.status];

    next();
});

lessonRequestSchema.pre('save', function (next) {
    this.idSearch = this._id.toString();

    next();
});

lessonRequestSchema.methods.getStartDate = function() {
    const date = new Date(this.date);
    const startingHour = this.hours.startingHour;
    date.setHours(startingHour.hour, startingHour.minute);

    return date;
}

lessonRequestSchema.set('toJSON', { virtuals: true });
lessonRequestSchema.set('toObject', { virtuals: true });

const LessonRequest = mongoose.model('LessonRequest', lessonRequestSchema);

module.exports = LessonRequest;