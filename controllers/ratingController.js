const User = require("../models/User");
const catchErrorAsync = require("../utils/catchErrorAsync");
const Rating = require('../models/Rating');
const AppError = require("../utils/appError");

exports.postRate = catchErrorAsync(async (req, res, next) => {
    const { teacherId, rate, text } = req.body;

    const student = await User.findById(req.user.id);
    const teacher = await User.findById(teacherId);

    if (!teacher) {
        return next(
            new AppError(
                'Teacher not found',
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
                'You already left your opinion on this teacher',
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
                404,
                'Rating not found'
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