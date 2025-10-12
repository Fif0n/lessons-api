const mongoose = require('mongoose');

const hourSchema = new mongoose.Schema({
    hour: {
        type: Number,
        min: 0,
        max: 23,
        required: [true, 'Hour is required']
    },
    minute: {
        type: Number,
        min: 0,
        max: 59,
        required: [true, 'Minute is required']
    }
});

const timeRangeSchema = new mongoose.Schema({
    hourFrom: {
        type: hourSchema,
        required: [true, 'Starting hour is required']
    },
    hourTo: {
        type: hourSchema,
        required: [true, 'Ending hour is required'],
        validate: {
            validator: function (value) {
                const { hourFrom } = this;
                const fromMinutes = hourFrom.hour * 60 + hourFrom.minute;
                const toMinutes = value.hour * 60 + value.minute;
                return fromMinutes < toMinutes;
            },
            message: 'Starting cannot be lower than ending'
        }
    }
});

const daySchema = new mongoose.Schema({
    dayName: {
        type: String,
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