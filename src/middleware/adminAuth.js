const jwt = require('jsonwebtoken')
const User = require('../models/userModel')

const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '')
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findOne({
            _id: decoded._id,
            tokens: {
                $elemMatch: {
                    token: token,
                    expires: {$gte: Date.now()}
                }
            }
        })

        if (!user) {
            throw new Error()
        }

        if (user.userType !== 'ADMIN') {
            throw new Error()
        }

        user.tokens.map((validToken, index)=>{
            if(validToken.token===token){
                user.tokens[index].expires = new Date(Date.now()+3600000)
            }
        })

        await user.save()

        req.token = token
        req.user = user
        next()
    } catch (e) {
        res.status(401).send({error: 'Please authenticate as an admin.'})
    }
}

module.exports = adminAuth
