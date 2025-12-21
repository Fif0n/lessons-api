const User = require("../models/User");
const catchErrorAsync = require("../utils/catchErrorAsync");
const Rating = require('../models/Rating');
const AppError = require("../utils/appError");
const { t } = require('../utils/i18n');

exports.postRate = catchErrorAsync(async (req, res, next) => {
    const { teacherId, rate, text } = req.body;

    const student = await User.findById(req.user.id);
    const teacher = await User.findById(teacherId);

    if (!teacher) {
        return next(
            new AppError(
                t('teacher.notFound', req.language || 'en'),
                400
            )
        );
    }

    const ratingExist = await Rating.findOne({
        student,
        teacher
    });

    if (ratingExist) {
        return next(
            new AppError(
                t('rating.alreadyLeftOpinion', req.language || 'en'),
                400
            )
        );
    }

    const rating = new Rating({
        student,
        teacher,
        text,
        rate
    });

    await rating.save();

    res.status(201).json({
        status: 'success',
        data: {
            rating
        }
    });
});

exports.updateRate = catchErrorAsync(async (req, res, next) => {
    const rating = await Rating.findOne({
        _id: req.params.id,
        student: req.user.id
    });

    if (!rating) {
        return next(
            new AppError(
                t('rating.notFound', req.language || 'en'),
                404
            )
        );
    }

    const { rate, text } = req.body;

    rating.rate = rate;
    rating.text = text;
    await rating.save();

    res.status(200).json({
        status: 'success',
        data: {
            rating
        }
    });
});