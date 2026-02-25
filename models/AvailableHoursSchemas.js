const mongoose = require('mongoose');

const hourSchema = new mongoose.Schema({
    hour: {
        type: Number,
        min: 0,
        max: 23,
        required: [true, 'validation.availableHours.hourRequired']
    },
    minute: {
        type: Number,
        min: 0,
        max: 59,
        required: [true, 'validation.availableHours.minuteRequired']
    }
});

const timeRangeSchema = new mongoose.Schema({
    hourFrom: {
        type: hourSchema,
        required: [true, 'validation.availableHours.startingHourRequired']
    },
    hourTo: {
        type: hourSchema,
        required: [true, 'validation.availableHours.endingHourRequired'],
        validate: {
            validator: function (value) {
                const { hourFrom } = this;
                const fromMinutes = hourFrom.hour * 60 + hourFrom.minute;
                const toMinutes = value.hour * 60 + value.minute;
                return fromMinutes < toMinutes;
            },
            message: 'validation.availableHours.startingHourCannotBeGreater'
        }
    }
});

const daySchema = new mongoose.Schema({
    dayNumber: {
        type: Number,
        min: 1,
        max: 7,
        required: true
    },
    hours: {
        type: [timeRangeSchema],
    },
});

const dayOfWeekSchema = new mongoose.Schema({
    dayOfWeek: [daySchema]
});


module.exports = dayOfWeekSchema;