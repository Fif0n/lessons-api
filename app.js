const express = require('express');
const userRoutes = require('./routes/userRoutes');
const teachersRoutes = require('./routes/teachersRoutes');
const authRoutes = require('./routes/authRoutes');
const lessonRequestRoutes = require('./routes/lessonRequestRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const ratingsRoutes = require('./routes/ratingsRoutes');
const morgan = require('morgan');
const errorHandler = require('./utils/errorHandler');
const path = require('path');


const app = express();

app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(express.json({ limit: '10kb' }));

// Middlewware - pobieranie języka
app.use((req, res, next) => {
    req.language = req.header('Accept-Language')?.split('-')[0] || 'en';
    next();
});

app.use('/api', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/teacher', teachersRoutes);
app.use('/api/lesson-request', lessonRequestRoutes);
app.use('/api/conversation', conversationRoutes);
app.use('/api/rating', ratingsRoutes);

app.all(/(.*)/, (req, res, next) => {
    res.status(404).json({
        error: 'Path not found'
    });
});

// Globalny error handler
app.use(errorHandler);

module.exports = app;