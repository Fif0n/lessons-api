const mongoose = require('mongoose');
const { status } = require('../enums/lessonRequestEnums');
const { subjects, schoolLevels, lessonPlaces } = require('../enums/userEnums');
const dateHelper = require('../utils/dateHelper');

const lessonRequestSchema = mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Student is required'],
        },
        teacher: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Teacher is required'],
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
        },
        hours: {
            startingHour: {
                hour: {
                    type: Number,
                    required: [true, 'Starting hour is required'],
                    mix: 1,
                    max: 24,
                },
                minute: {
                    type: Number,
                    required: [true, 'Starting hour is required'],
                    mix: 0,
                    max: 60,
                }
            },
            endingHour: {
                hour: {
                    type: Number,
                    required: [true, 'Ending hour is required'],
                    mix: 1,
                    max: 23,
                },
                minute: {
                    type: Number,
                    required: [true, 'Ending hour is required'],
                    mix: 0,
                    max: 59,
                }
            }
        },
        comment: String,
        moneyRate: {
            type: Number,
            required: [true, 'Lesson cost is required']
        },
        status: {
            type: String,
            default: 'pending',
            enum: Object.keys(status)
        },
        subject: {
            type: String,
            enum: Object.keys(subjects),
            required: [true, 'Subject is required']
        },
        schoolLevel: {
            type: String,
            enum: Object.keys(schoolLevels),
            required: [true, 'School level is required']
        },
        lessonPlace: {
            type: String,
            enum: Object.keys(lessonPlaces),
            required: [true, 'Lesson place is required']
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