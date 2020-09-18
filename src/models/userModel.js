const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Location = require('./locationModel')

const userSchema = new mongoose.Schema({
    id : {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        },
        unique: true,
    },
    grade: {
        type: String,
        trim: true,
    },
    homeroomTeacher: {
        type: String,
        ref: 'User',
    },
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
    },
    userType : {
        type: String,
        enum: ['STUDENT', 'TEACHER', 'ADMIN'],
        required: true,
    },
    qrString: {
        type: String,
        trim: true,
    },
    teacherLocation: {
        // type: mongoose.Schema.Types.ObjectId,
        type: Number,
        // ref: 'Location',
        trim: true,
    },
    tokens: [{
        token: {
            type: String,
            required: true,
        },
        expires: {
            type: Date,
            required: true,
        }
    }],
},  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
} )

// similar to sql join key
userSchema.virtual('passes', {
    ref: 'Pass',
    localField: '_id',
    foreignField: 'student'
})

userSchema.virtual('room', {
    ref: 'Location',
    localField: 'teacherLocation',
    foreignField: 'id',
    justOne: true,
})

userSchema.virtual('homeroom', {
    ref: 'User',
    localField: 'homeroomTeacher',
    foreignField: 'id',
    justOne: true,
})

userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens
    delete userObject.__v

    return userObject
}

userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ _id: user._id.toString() },
        '12$6KSzf4O2m0RFYRFOzN/vE.qt0tvCS.BXGIl0wFk4FZ4IWf')
    const expires = new Date(Date.now() + 3600000)

    user.tokens = user.tokens.concat({ token, expires})
    await user.save()

    return {token, expires}
}

userSchema.statics.findByCredentials = async (email, password) => {
    let user = await User.findOne({ email })
    if(!user){
        user = await User.findOne({ username: email })
    }

    if (!user) {
        throw new Error('Unable to login')
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        throw new Error('Unable to login')
    }

    return user
}

// Hash the plain text password before saving
userSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 12)
    }

    next()
})

const User = mongoose.model('User', userSchema)

module.exports = User
