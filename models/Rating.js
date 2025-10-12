const mongoose = require('mongoose');
const User = require('./User');
const dateHelper = require('../utils/dateHelper');

const ratingSchema = mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Student is required']
        },
        teacher: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Teacher is required']
        },
        text: {
            type: String,
        },
        rate: {
            type: Number,
            min: [1, 'Min rating is 1.0'],
            max: [5, 'Max rating is 5.0'],
            required: [true, 'U have to provide rating'],

        },
        timestamp: {
            type: String,
            default: () => {
                const now = new Date();
                return dateHelper.getHumanTimestamp(now);
            },
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

ratingSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'student',
        select: 'name surname email'
    }).populate({
        path: 'teacher',
        select: 'name surname email'
    });

    next();
});

ratingSchema.statics.calcAvg = async function (teacher) {
    const reviews = await this.aggregate([
        {
            $match: { teacher: teacher._id }
        },
        {
            $group: {
                _id: '$teacher',
                sumRating: { $sum: 1 },
                avgRating: { $avg: '$rate'}
            }
        }
    ]);

    if (reviews.length > 0) {
        await User.findByIdAndUpdate(
            teacher,
            {
                ratingAvg: reviews[0].avgRating,
                ratingCount: reviews[0].sumRating,
            }
        );
    }
}

ratingSchema.post('save', function () {
    this.constructor.calcAvg(this.teacher);
});

ratingSchema.post(/^findOneAnd/, async function (doc) {
    if (doc) await doc.constructor.calcAverageRatings(doc.teacher);
});

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating