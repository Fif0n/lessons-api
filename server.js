const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({path: './.env'});

const app = require('./app');


const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.SECRET_ACCESS_TOKEN
);

mongoose.connect(DB).then(() => console.log('Connected'));

const port = process.env.PORT || 8000;

const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})

process.on('unhandledRejection', () => {
    server.close(() => {
        process.exit(1);
    });
});