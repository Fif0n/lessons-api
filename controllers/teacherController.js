const catchErrorAsync = require("../utils/catchErrorAsync");
const User = require('./../models/User');
const LessonRequest = require('./../models/LessonRequest');
const { roles } = require('../enums/userEnums');
const AppError = require('../utils/appError');
const { status } = require('../enums/lessonRequestEnums');
const Rating = require("../models/Rating");

const handleListOfParams = value => {
    return typeof value === 'string' ? [value] : Object.values(value || {})
}

exports.getTeacherList = catchErrorAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const skip = (page - 1) * perPage;

    const { money_rate, min_lesson_length, max_lesson_length } = req.query;

    const subject = handleListOfParams(req.query.subject); 
    const schoolLevel = handleListOfParams(req.query.school_level);
    const lessonPlace = handleListOfParams(req.query.lesson_place);

    let query = { verified: true, role: roles.teacher };

    if (subject.length > 0) query.subject = { $in: subject };
    if (schoolLevel.length > 0) query.schoolLevel = { $in: schoolLevel };
    if (lessonPlace.length > 0) query.lessonPlace = { $in: lessonPlace };

    if (money_rate) {
        query.lessonMoneyRate = { $lte: +money_rate };
    }

    if (min_lesson_length) {
        query.lessonLength = { $gte: +min_lesson_length };
    }

    if (max_lesson_length) {
        query.lessonLength = { $lte: +max_lesson_length };
    }

    if (max_lesson_length && min_lesson_length) {
        query.lessonLength = { $lte: +max_lesson_length, $gte: +min_lesson_length };
    }

    const users = await User.find(query)
        .skip(skip)
        .limit(perPage);

    let ordinalNumber = 0;
    const response = users.map(user => {
        ordinalNumber++;

        return {
            id: user._id,
            email: user.email,
            name: user.name,
            surname: user.surname,
            phoneNumber: user.phoneNumber,
            image: user.getBase64Avatar(),
            ordinalNumber,
            description: user.yourselfDescription,
            ratingAvg: user.ratingAvg,
            ratingCount: user.ratingCount
        };
    });

    res.status(200).json(response);
});

exports.getTeacherData = catchErrorAsync(async (req, res, next) => {
    const user = await User.findOne({ _id: req.params.id, role: roles.teacher });

    user.avatar = user.getBase64Avatar();

    const now = new Date();

    const hadLessonBefore = await LessonRequest.findOne({
        status: 'accepted',
        teacher: user._id,
        student: req.user.id,
        $expr: {
            $lt: [
                {
                    $dateAdd: {
                        startDate: '$date',
                        unit: 'minute',
                        amount: {
                            $add: [
                                { $multiply: ['$hours.endingHour.hour', 60] },
                                '$hours.endingHour.minute'
                            ]
                        }
                    }
                },
                now
            ]
        }
    });

    const rate = await Rating.findOne({
        teacher: user._id,
        student: req.user._id
    });

    res.status(200).json({
        status: 'success',
        data: {
            user,
            canLeaveComment: hadLessonBefore ? true : false,
            rate
        }
    });
});

exports.sendLessonRequest = catchErrorAsync(async (req, res, next) => {
    const student = await User.findById(req.user.id);
    const { date, hours, comment, subject, schoolLevel, lessonPlace } = req.body;
    const teacher = await User.findById(req.params.id);

    if (!teacher) {
        return next(
            new AppError('ValidationError', 422, {
                teacher: 'Teacher not found',
            })
        );
    }

    if (!teacher.isTeacherHaveAvailableLessons(
        hours.startingHour.hour,
        hours.startingHour.minute,
        hours.endingHour.hour,
        hours.endingHour.minute,
        date
    )) {
        return next(
            new AppError('ValidationError', 422, {
                date: 'Teacher does not give lessons on that time',
            })
        );
    }

    const now = new Date();
    const inputDate = new Date(`${date}T${ hours.startingHour.hour.toString().padStart(2, '0')}:${ hours.startingHour.minute.toString().padStart(2, '0')}`);

    if (inputDate <= now) {
        return next(
            new AppError('ValidationError', 422, {
                date: 'Time cannot be in the past',
            })
        );
    }

    const newStartTotalMinutes = hours.startingHour.hour * 60 + hours.startingHour.minute;
    const newEndTotalMinutes = hours.endingHour.hour * 60 + hours.endingHour.minute;

    const existingRequestInThatTime = await LessonRequest.findOne({
        teacher,
        date,
        $expr: {
            $and: [
                { 
                    $lt: [
                        { $add: [ { $multiply: ["$hours.startingHour.hour", 60] }, "$hours.startingHour.minute" ] },
                        newEndTotalMinutes
                    ]
                },
                { 
                    $gt: [
                        { $add: [ { $multiply: ["$hours.endingHour.hour", 60] }, "$hours.endingHour.minute" ] },
                        newStartTotalMinutes
                    ]
                }
            ]
        }
    });

    if (existingRequestInThatTime) {
        return next(
            new AppError('ValidationError', 422, {
                date: 'In this time teacher has other lesson. Please select other date',
            })
        );
    }

    const newLessonRequest = new LessonRequest({
        student,
        teacher,
        date,
        hours,
        subject,
        schoolLevel,
        lessonPlace,
        comment,
        moneyRate: teacher.lessonMoneyRate,
    });

    await newLessonRequest.save();

    res.status(201).json({
        status: 'success',
        data: {
            lessonRequest: newLessonRequest
        }
    });
});

exports.getActiveRequests = catchErrorAsync(async (req, res, next) => {
    const date = new Date(req.params.date);
    const teacher = await User.findById(req.params.id)

    const requests = await LessonRequest.find({
        status: { $ne: status.rejected },
        date,
        teacher,
    });

    const data = requests.map(el => el.hours);

    res.status(200).json({
        status: 'success',
        data: data,
    });
});

exports.getTeacherRatings = catchErrorAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const skip = (page - 1) * perPage;

    const teacherId = req.params.id == undefined ? req.user.id  : req.params.id;

    const ratings = await Rating
        .find({
            teacher: teacherId,
        })
        .skip(skip)
        .limit(perPage)
        .sort({ createdAt: -1 });

    res.status(200).json(ratings);
});