const LessonRequest = require('../models/LessonRequest');
const catchErrorAsync = require('../utils/catchErrorAsync');
const { status } = require('../enums/lessonRequestEnums');
const { subjects, schoolLevels, lessonPlaces } = require('../enums/userEnums');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');
const dateHelper = require('../utils/dateHelper');
const { t } = require('../utils/i18n');
const { translateEnumValue, translateEnumObject } = require('../utils/enumHelper');

exports.getLessonRequests = catchErrorAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const skip = (page - 1) * perPage;
    const { status, id } = req.query;

    const user = await User.findById(req.user.id);

    let query = {
        $or: [
            { teacher: user },
            { student: user }
        ], 
    };

    if (status) query.status = status;
    if (id) query.idSearch = { $regex: id, $options: 'i' };

    const lessonRequest = await LessonRequest
        .find(query)
        .skip(skip)
        .limit(perPage);

    let ordinalNumber = 0;
    const language = req.language || 'en';
    const response = lessonRequest.map(request => {
        ordinalNumber++;
        request.ordinalNumber = ordinalNumber;
        request.subject = translateEnumValue(subjects, request.subject, language);
        request.schoolLevel = translateEnumValue(schoolLevels, request.schoolLevel, language);
        request.lessonPlace = translateEnumValue(lessonPlaces, request.lessonPlace, language);
        request.status = translateEnumValue(status, request.status, language);

        return request;
    });

    res.status(200).json(response);
});

exports.getLessonRequestStatuses = (req, res, next) => {
    const language = req.language || 'en';

    res.status(200).json({
        status: 'success',
        data: {
            status: translateEnumObject(status, language)
        }
    });
};

exports.getLessonRequest = catchErrorAsync(async (req, res, next) => {
    const id = req.params.id;
    const user = await User.findById(req.user.id);
    const language = req.language || 'en';

    const lessonRequest = await LessonRequest.findOne({
        $or: [
            { teacher: user },
            { student: user }
        ],
        _id: id
    });

    lessonRequest.subject = translateEnumValue(subjects, lessonRequest.subject, language);
    lessonRequest.schoolLevel = translateEnumValue(schoolLevels, lessonRequest.schoolLevel, language);
    lessonRequest.lessonPlace = translateEnumValue(lessonPlaces, lessonRequest.lessonPlace, language);
    lessonRequest.status = translateEnumValue(status, lessonRequest.status, language);

    res.status(200).json({
        status: 'success',
        data: {
            lessonRequest
        }
    });
});

exports.postLessonRequest = catchErrorAsync(async (req, res, next) => {
    const id = req.params.id;
    const user = await User.findById(req.user.id);

    const { newStatus, message } = req.body;
    
    const lessonRequest = await LessonRequest.findOne({
        $or: [
            { teacher: user },
            { student: user }
        ],
        _id: id
    });

    if (newStatus in status && newStatus != 'pending') {
        lessonRequest.status = newStatus;
    }

    if (newStatus == 'accepted') {
        const now = new Date();

        if (lessonRequest.getStartDate() < now) {
            return next(
                new AppError(
                    t('lesson.cannotAcceptAfterDeadline', req.language || 'en'),
                    400,
                    {data: {date: t('lesson.cannotAcceptAfterDeadline', req.language || 'en')}}
                )
            );
        }
    }

    const returnData = {};

    if (newStatus == 'pending' || newStatus == 'rejected') {
        const messages = [];

        if (lessonRequest.comment.lenght > 0) {
            messages.push({
                user: lessonRequest.student,
                messageText: lessonRequest.comment
            });
        }

        if (message.length > 0) {
            messages.push({
                user,
                messageText: message,
            });
        }

        let conversation = await Conversation.findOne({
            lessonRequest
        });

        if (conversation) {
            conversation.messages = conversation.messages.concat(messages);

            await conversation.save();
        } else {
            conversation = await Conversation.create({
                lessonRequest,
                messages
            });
        }

        returnData.conversation = conversation;
    }

    await lessonRequest.save();

    lessonRequest.subject = subjects[lessonRequest.subject];
    lessonRequest.schoolLevel = schoolLevels[lessonRequest.schoolLevel];
    lessonRequest.lessonPlace = lessonPlaces[lessonRequest.lessonPlace];
    lessonRequest.status = status[lessonRequest.status];

    returnData.lessonRequest = lessonRequest;

    res.status(200).json({
        status: 'success',
        data: returnData,
    });
});

exports.setLessonLink = catchErrorAsync(async (req, res, next) => {
    const teacher = await User.findById(req.user.id);

    const lessonRequest = await LessonRequest.findOne({
        _id: req.params.id,
        teacher
    });

    if (!lessonRequest) {
        return next(
            new AppError(
                'Lesson request not found',
                404
            )
        );
    }

    if (lessonRequest.lessonPlace != 'online') {
        return next(
            new AppError(
                'Only online lessons can have lesson link',
                400
            )
        );
    }

    const { link } = req.body;

    lessonRequest.onlineLessonLink = link;

    await lessonRequest.save();

    lessonRequest.subject = subjects[lessonRequest.subject];
    lessonRequest.schoolLevel = schoolLevels[lessonRequest.schoolLevel];
    lessonRequest.lessonPlace = lessonPlaces[lessonRequest.lessonPlace];
    lessonRequest.status = status[lessonRequest.status];

    res.status(201).json({
        status: 'success',
        data: { lessonRequest }
    });
});

exports.getIncomingLessons = catchErrorAsync(async (req, res, next) => {
    const year = parseInt(req.params.year);
    const week = parseInt(req.params.week);
    const language = req.language || 'en';

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const result = await LessonRequest.aggregate([
      {
        $match: {
          status: 'accepted',
          $or: [
            { student: userId },
            { teacher: userId }
          ],
        }
      },
      {
        $addFields: {
          lessonDateTime: {
            $dateFromParts: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              day: { $dayOfMonth: "$date" },
              hour: "$hours.startingHour.hour",
              minute: "$hours.startingHour.minute"
            }
          },
          dateFormatted: {
            $dateToString: {
                format: "%Y-%m-%d",
                date: "$date"
            }
          }
        }
      },
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $isoWeek: "$lessonDateTime" }, week] },
              { $eq: [{ $isoWeekYear: "$lessonDateTime" }, year] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $project: {
          "student.password": 0,
          "student.__v": 0,
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacher',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      { $unwind: '$teacher' },
      {
        $project: {
          "teacher.password": 0,
          "teacher.__v": 0,
        }
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$lessonDateTime" },
            week: { $isoWeek: "$lessonDateTime" }
          },
          requests: { $push: "$$ROOT" }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.week": 1
        }
      }
    ]);

    const translatedResult = result.map(group => ({
      ...group,
      requests: group.requests.map(request => ({
        ...request,
        subject: translateEnumValue(subjects, request.subject, language),
        schoolLevel: translateEnumValue(schoolLevels, request.schoolLevel, language),
        lessonPlace: translateEnumValue(lessonPlaces, request.lessonPlace, language),
        status: translateEnumValue(status, request.status, language)
      }))
    }));

    res.status(200).json(translatedResult);
});

exports.getLessonsHistory = catchErrorAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.per_page) || 20;
  const skip = (page - 1) * perPage;

  const { id, name, subject } = req.query;

  const now = new Date();

  const matchStage = {
    status: 'accepted',
    $or: [
      { teacher: user._id },
      { student: user._id }
    ],
    $expr: {
      $lt: [
        {
          $dateAdd: {
            startDate: "$date",
            unit: "minute",
            amount: {
              $add: [
                { $multiply: ["$hours.endingHour.hour", 60] },
                "$hours.endingHour.minute"
              ]
            }
          }
        },
        now
      ]
    }
  };

  if (id) matchStage.idSearch = { $regex: id, $options: 'i' };
  if (subject) matchStage.subject = subject;

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'teacher',
        foreignField: '_id',
        as: 'teacher'
      }
    },
    { $unwind: '$teacher' },
    {
      $project: {
        "teacher.password": 0,
        "teacher.__v": 0,
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'student',
        foreignField: '_id',
        as: 'student'
      }
    },
    { $unwind: '$student' },
    {
      $project: {
        "student.password": 0,
        "student.__v": 0,
      }
    },
  ];

  if (name) {
    if (user.role === 'student') {
      pipeline.push({
        $match: {
          $or: [
            { "teacher.name": { $regex: name, $options: "i" } },
            { "teacher.surname": { $regex: name, $options: "i" } }
          ]
        }
      });
    } else if (user.role === 'teacher') {
      pipeline.push({
        $match: {
          $or: [
            { "student.name": { $regex: name, $options: "i" } },
            { "student.surname": { $regex: name, $options: "i" } }
          ]
        }
      });
    }
  }

  pipeline.push({
    $addFields: {
      dateFormatted: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$date",
        }
      },
      subject: {
        $switch: {
          branches: Object.keys(subjects).map(key => ({
            case: { $eq: ["$subject", key] },
            then: subjects[key]
          })),
          default: "$subject"
        }
      },
    }
  });

  pipeline.push(
    { $skip: skip },
    { $limit: perPage }
  );

  const lessons = await LessonRequest.aggregate(pipeline);

  res.status(200).json(lessons);
});

exports.getLessonsHistoryEnums = (req, res, next) => {
  const language = req.language || 'en';

  res.status(200).json({
    status: 'success',
    data: {
      subjects: translateEnumObject(subjects, language)
    }
  });
};