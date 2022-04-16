// controller actions
const jwt = require("jsonwebtoken");
const jwtKey = process.env.JWT_TOKEN_PUBLIC || "WORD_CHAIN_JWT_TOKEN";


module.exports.login_post = async (req, res, next) => {
    try {
        const { avatarId, name, language, id } = req.body;

        const token = jwt.sign({ avatarId, name, language, id, date: Date.now() }, jwtKey);

        res.statusCode = 200;
        res.send({ status: 200, data: { token }, message: 'Success' })
    } catch (err) {
        res.statusCode = 400;
        res.send({ status: 400, message: err })
    }
    next()

}

