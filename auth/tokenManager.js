const jwt = require('jsonwebtoken');

exports.signJwtToken = user => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            name: user.name,
            surname: user.surname
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRE_TIME,
        }
    );
};

exports.saveTokenOptionsToCookies = (token, res) => {
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRE_TIME * 24 * 60 * 60
        ),
        httpOnly: true,
        secure: true
    };

    res.cookie('jwt', token, cookieOptions);
}