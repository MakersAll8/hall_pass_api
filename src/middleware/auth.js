const jwt = require('jsonwebtoken')
const User = require('../models/userModel')

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '')
        const decoded = jwt.verify(token, '12$6KSzf4O2m0RFYRFOzN/vE.qt0tvCS.BXGIl0wFk4FZ4IWf')
        // const user = await User.findOne({ _id: decoded._id, 'tokens.token': token })
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
        res.status(401).send({error: 'Please authenticate.'})
    }
}

module.exports = auth
