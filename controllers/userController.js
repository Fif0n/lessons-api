const User = require('./../models/User');
const catchErrorAsync = require('../utils/catchErrorAsync');
const AppError = require('../utils/appError');
const { roles, subjects, schoolLevels, lessonPlaces } = require('../enums/userEnums');
const { signJwtToken, saveTokenOptionsToCookies } = require('../auth/tokenManager');
const fs = require('fs');
const path = require('path');
const LessonRequest = require('../models/LessonRequest');
const mongoose = require('mongoose');

const teacherScenarios = {
    updateBasicData: ['name', 'surname', 'email', 'phoneNumber', 'yourselfDescription', 'profileImage'],
    updateLessonsSettings: ['subject', 'schoolLevel', 'lessonPlace', 'location', 'lessonsPlatform', 'lessonMoneyRate', 'lessonLength'],
    updateAvailableHours: ['availableHours']
}

const studentScenarios = {
    updateBasicData: ['name', 'surname', 'email', 'phoneNumber', 'profileImage']
}

const filterObj = (obj, allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });

    return newObj;
};

exports.updateProfileSettings = catchErrorAsync(async (req, res, next) => {
    const scenario = req.body.scenario;
    let filteredBody = {};
    const scenarios = req.user.role == roles.student ? studentScenarios : teacherScenarios;

    if (scenarios[scenario] == undefined) {
        return next(new AppError('Something went wrong', 400));
    }

    filteredBody = filterObj(req.body, scenarios[scenario]);

    const user = await User.findById(req.user.id);
    
    for (const [key, value] of Object.entries(filteredBody)) {
        user[key] = value;
    }

    await user.save();

    const token = signJwtToken(user);
    saveTokenOptionsToCookies(token, res);

    res.status(200).json({
        status: 'success',
        token,
        data: { user },
    });
});

exports.getUserData = catchErrorAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        status: 'success',
        message: 'User updated',
        data: { user },
    });
});

exports.getLessonsSettings = catchErrorAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        status: 'success',
        data: {
            user,
            enums: {
                subjects,
                schoolLevels,
                lessonPlaces
            }
        }
    });
});

const parseObjectToArray = object => {
    if (!object) {
        return [];
    }
    return Object.keys(object);
}

exports.updateLessonsSettings = catchErrorAsync(async (req, res, next) => {
    const body = req.body;
    const scenario = body.scenario || '';

    let filteredBody = {};
    const scenarios = req.user.role == roles.student ? studentScenarios : teacherScenarios;

    if (scenarios[scenario] == undefined) {
        return next(new AppError('Something went wrong', 400));
    }

    filteredBody = filterObj(body, scenarios[scenario]);
    filteredBody.lessonPlace = parseObjectToArray(filteredBody.lessonPlace);
    filteredBody.schoolLevel = parseObjectToArray(filteredBody.schoolLevel);
    filteredBody.subject = parseObjectToArray(filteredBody.subject);

    if (filteredBody.lessonPlace && !filteredBody.lessonPlace.includes('onSite')) {
        filteredBody.location = {};
    }

    if (filteredBody.lessonPlace && !filteredBody.lessonPlace.includes('online')) {
        filteredBody.lessonsPlatform = '';
    }

    const user = await User.findById(req.user.id);

    user.subject = filteredBody.subject;
    user.schoolLevel = filteredBody.schoolLevel;
    user.lessonPlace = filteredBody.lessonPlace;
    user.location = filteredBody.location;
    user.lessonsPlatform = filteredBody.lessonsPlatform;
    user.lessonMoneyRate = filteredBody.lessonMoneyRate;
    user.lessonLength = filteredBody.lessonLength;

    await user.save()

    res.status(200).json({
        status: 'success',
        data: { user },
    });
});

exports.updateAvailableHours = catchErrorAsync(async (req, res, next) => {
    const scenario = req.body.scenario;
    let filteredBody = {};
    const scenarios = req.user.role == roles.student ? studentScenarios : teacherScenarios;

    if (scenarios[scenario] == undefined) {
        return next(new AppError('Something went wrong', 400));
    }

    filteredBody = filterObj(req.body, scenarios[scenario]);

    const user = await User.findById(req.user.id);
    user.availableHours = filteredBody.availableHours;

    await user.save();

    res.status(200).json({
        status: 'success',
        data: { user },
    });
});

exports.getAvailableHours = catchErrorAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('availableHours');

    res.status(200).json({
        status: 'success',
        data: user.availableHours,
    });
});

exports.getProfileData = catchErrorAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    const neededActions = user.neededActionsToVerification();

    res.status(200).json({
        status: 'success',
        data: {
            neededActions
        },
    });
});

exports.uploadUserAvatar = catchErrorAsync(async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            status: 'File not found',
        });
    }

    const user = await User.findById(req.user.id);

    if (user.avatar) {
        const oldPath = path.join(__dirname, '../uploads', user.avatar);
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }
    }

    user.avatar = req.file.filename;
    await user.save();

    res.status(200).json({
        status: 'success',
        data: { user }
    })
});

exports.getUserAvatar = catchErrorAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    const imagePath = path.join(__dirname, '../uploads', user.avatar);

    res.setHeader('Content-Type', 'image/jpeg');

    fs.createReadStream(imagePath).pipe(res);
});

exports.deleteHoursRange = catchErrorAsync(async (req, res, next) => {

});

exports.getEsitimatedIncome = catchErrorAsync(async (req, res, next) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const teacherId = new mongoose.Types.ObjectId(req.user.id)

    let results = await LessonRequest.aggregate([
      {
        $match: {
          status: 'accepted',
          date: { $gte: startOfMonth, $lte: endOfMonth },
          teacher: teacherId,
        }
      },
      {
        $addFields: {
          lessonEndDate: {
            $dateFromParts: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              day: { $dayOfMonth: "$date" },
              hour: "$hours.endingHour.hour",
              minute: "$hours.endingHour.minute",
              second: 0,
              millisecond: 0,
            }
          }
        }
      },
      {
        $facet: {
          currentIncome: [
            {
              $match: {
                lessonEndDate: { $lte: now }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$moneyRate" }
              }
            }
          ],
          futureIncome: [
            {
              $match: {
                lessonEndDate: { $gt: now }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$moneyRate" }
              }
            }
          ]
        }
      },
      {
        $project: {
          currentIncome: { $ifNull: [{ $arrayElemAt: ["$currentIncome.total", 0] }, 0] },
          futureIncome: { $ifNull: [{ $arrayElemAt: ["$futureIncome.total", 0] }, 0] },
        }
      },
      {
        $addFields: {
          estimatedIncome: { $add: ["$currentIncome", "$futureIncome"] }
        }
      }
    ]);

    results = results[0] || { currentIncome: 0, futureIncome: 0, estimatedIncome: 0 };

    res.status(200).json({
        status: 'success',
        data: {
            results
        }
    });
});