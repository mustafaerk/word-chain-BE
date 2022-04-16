const jwt = require('jsonwebtoken');

const jwtKey = process.env.JWT_TOKEN_PUBLIC || "WORD_CHAIN_JWT_TOKEN";

module.exports = (req, res, next) => {
    try {
        /*JWT is send with request header! 
        Format of it: Authorization : Bearer <token>
        */
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(token, jwtKey);
        req.body.userToken = decodedToken;
        next();
    } catch (error) {
        return res.status(401).send({
            message: 'Auth failed',
            error
        });
    }
}