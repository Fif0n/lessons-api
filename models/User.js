const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');
const { roles, subjects, schoolLevels, lessonPlaces } = require('../enums/userEnums');
const AvailableHoursSchemas = require('./AvailableHoursSchemas');
const path = require('path');
const fs = require('fs');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            validate: {
                validator: function (val) {
                    if (val) {
                        return validator.isEmail(val);
                    }
                    return true;
                },
                message: 'Email is incorrect',
            }
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            trim: true,
            minLenght: 6,
            select: false,
        },
        passwordConfirm: {
            type: String,
            validate: {
                validator: function (val) {
                    return this.password === val;
                },
                message: 'Passwords are not the same',
            }
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        surname: {
            type: String,
            required: [true, 'Surname is required'],
            trim: true,
        },
        role: {
            type: String,
            enum: Object.keys(roles),
            default: roles.student
        },
        subject: {
            type: [String],
            enum: Object.keys(subjects)
        },
        schoolLevel: {
            type: [String],
            enum: Object.keys(schoolLevels)
        },
        lessonPlace: {
            type: [String],
            enum: Object.keys(lessonPlaces)
        },
        location: {
            coordinates: {
                type: [Number],
                required: [function () {
                    return this.lessonPlace && this.lessonPlace.includes('onSite');
                },
                'Location is required while you can conduct lessons on site']
            },
            address: {
                type: String,
                required: [function () {
                    return this.lessonPlace && this.lessonPlace.includes('onSite');
                },
                'Location is required while you can conduct lessons on site']
            },
        },
        lessonsPlatform: {
            type: String,
            required: [function (val) {
                return !val && this.lessonPlace && this.lessonPlace.includes('online')
            },
            'Platform is required while you can conduct lessons online']
        },
        lessonMoneyRate: {
            type: Number,
            default: 0
        },
        lessonLength: {
            // Wartość w minutach
            type: Number,
            default: 60
        },
        phoneNumber: {
            type: String
        },
        yourselfDescription: {
            type: String
        },
        profileImage: {
            // Jako URL
            type: String
        },
        // Głównie tyczy się nauczyciela
        verified: {
            type: Boolean,
            default: false
        },
        availableHours: {
            type: AvailableHoursSchemas
        },
        avatar: String,
        ratingAvg: {
            type: Number,
            default: null,
            min: 1,
            max: 5,
            set: val => Math.round(val * 10) / 10,
        },
        ratingCount: {
            type: Number,
            default: 0
        }
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
    { timestamps: true }
);


userSchema.pre('save', async function (next) {
    // Nie potrzebujemy tego w bazie
    this.passwordConfirm = undefined;
    if (this.role == roles.student) {
        this.verified = true;
    }

    if (this.role == roles.teacher) {
        if (
            this.schoolLevel.length > 0 &&
            this.subject.length > 0 &&
            this.lessonPlace.length > 0 &&
            this.lessonLength &&
            this.lessonMoneyRate &&
            Object.keys(this.availableHours).length > 0
        ) {
            this.verified = true;
        } else {
            this.verified = false;
        }
    }

    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);

    next();
});

userSchema.pre(/^find/, function (next) {
    if (this.role == roles.student) {
        this.subject = undefined;
        this.locaction = undefined;
        this.schoolLevel = undefined;
        this.lessonLength = undefined;
        this.lessonPlace = undefined;
        this.lessonsPlatform = undefined;
        this.lessonMoneyRate = undefined;
        this.availableHours = undefined;
    }

    next();
});

userSchema.methods.isPasswordCorrect = async (inputPassword, userPassword) => {
    return await bcrypt.compare(inputPassword, userPassword);
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10,
        );

        return JWTTimestamp < changedTimestamp;
    }

    // false = nie zmienione
    return false;
};

userSchema.methods.neededActionsToVerification = function() {
    const neededActions = [];

    if (this.schoolLevel.length <= 0) {
        neededActions.push('School level is needed');
    }

    if (this.subject.length <= 0 ) {
        neededActions.push('Subject is needed');
    }

    if (this.lessonPlace.length <= 0) {
        neededActions.push('Lessons place is needed');
    }

    if (!this.lessonLength) {
        neededActions.push('Lesson length is needed');
    }

    if (!this.lessonMoneyRate) {
        neededActions.push('Lesson money rate is needed');
    }

    if (Object.keys(this.availableHours).length <= 0) {
        neededActions.push('Available hours are needed');
    }

    return neededActions;
}

userSchema.methods.getBase64Avatar = function() {
    let base64Image = null;

    if (this.avatar) {
        const imagePath = path.join(__dirname, '../uploads', this.avatar);
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        }
    }

    return base64Image;
}

userSchema.methods.isTeacherHaveAvailableLessons = function (startingHour, startingMinute, endingHour, endingMinute, date) {
    const dayName = (new Date(date)).toLocaleDateString('en-US', { weekday: 'long' });
    const teacherAvailableHours = this.availableHours.dayOfWeek.find(el => el.dayName == dayName);

    if (teacherAvailableHours.hours.length == 0) {
        return false;
    }

    let insideHours = false;

    teacherAvailableHours.hours.forEach(hour => {
        if (
            hour.hourFrom.hour <= startingHour &&
            hour.hourTo.hour >= endingHour
        ) {
            let minutesCheck = true;
            if (
                hour.hourFrom.hour === startingHour &&
                hour.hourFrom.minute > startingMinute
            ) {
                minutesCheck = false;
            }

            if (
                hour.hourTo.hour === endingHour &&
                hour.hourTo.minute < endingMinute
            ) {
                minutesCheck = false;
            }

            insideHours = minutesCheck;
        }

        if (insideHours) {
            return;
        }
    });

    return insideHours;
}

const User = mongoose.model('User', userSchema);

module.exports = User;