const express = require('express')
const User = require('../models/userModel')
const auth = require('../middleware/auth')
const teacherAuth = require("../middleware/teacherAuth");
const adminAuth = require("../middleware/adminAuth");
const router = new express.Router()
const {v4: uuidv4} = require('uuid');

router.post('/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const {token, expires} = await user.generateAuthToken()
        res.send({user, token, expires})
    } catch (e) {
        res.send({error: 'Failed to log in'})
    }
})


router.post('/studentQrLogin/:qrString', async (req, res) => {
    try {
        const student = await User.findStudentByQrAndId(req.params.qrString, req.body.id)
        const {token, expires} = await student.generateAuthToken()
        res.send({user: student, token, expires})
    } catch (e) {
        res.send({error: 'Failed to log in'})
    }
})

router.get('/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()
        res.send({success: "Logged out"})
    } catch (e) {
        res.send({error: 'Failed to log out'})
    }
})

router.get('/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send({success: "Logged out"})
    } catch (e) {
        res.send({error: 'Failed to log out all'})
    }
})

// production create user
router.post('/users', adminAuth, async (req, res) => {
    try {
        const newUser = {
            id: req.body.id,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            username: req.body.username,
            password: req.body.password,
            userType: req.body.userType,
        }
        if (req.body.userType === 'STUDENT') {
            newUser.qrString = uuidv4()
            newUser.homeroomTeacher = req.body.homeroomTeacher
            newUser.grade = req.body.grade
        } else if (req.body.userType === 'TEACHER' || req.body.userType === 'ADMIN') {
            newUser.teacherLocation = req.body.teacherLocation
        }
        const user = new User(newUser)

        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({user, token})
    } catch (e) {
        if (e.code === 11000) {
            const duplicaetKeys = Object.keys(e.keyValue)
            res.send({error: duplicaetKeys.join(' ') + " already in use"})
            return
        }
        res.send({error: 'Failed to create user'})
    }
})

// update user
router.patch('/users/:id', adminAuth, async (req, res) => {
    try {
        const updateFields = Object.keys(req.body)
        const allowedUpdates = [
            'id', 'firstName', 'lastName', 'email', 'grade',
            'homeroomTeacher', 'username', 'password', 'userType',
            'qrString', 'teacherLocation'
        ]
        const isValidOperation = updateFields.every((update) => allowedUpdates.includes(update))

        if (!isValidOperation) {
            res.send({error: 'Invalid updates!'})
        }

        const user = await User.findOne({_id: req.params.id})
        if (!user) {
            res.send({error: 'Invalid updates!'})
        }
        updateFields.forEach((updateField) => {
            user[updateField] = req.body[updateField]
        })
        await user.save()
        res.send(user)

    } catch (e) {
        res.send({error: 'Failed to update!'})
    }
})

router.patch('/updatePassword', auth, async (req, res) => {
    try {
        const updateFields = Object.keys(req.body)
        const allowedUpdates = [
            'password'
        ]
        const isValidOperation = updateFields.every((update) => allowedUpdates.includes(update))

        if (!isValidOperation) {
            res.send({error: 'Invalid updates!'})
        }

        const user = await User.findOne({_id: req.user._id})
        if (!user) {
            res.send({error: 'Failed to update'})
            return
        }
        updateFields.forEach((updateField) => {
            user[updateField] = req.body[updateField]
        })
        await user.save()
        res.send(user)

    } catch (e) {
        res.send({error: 'Failed to update'})
    }
})

// get user
router.get('/users/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findOne({_id: req.params.id})
        if (!user) {
            res.send({error: "User not found"})
        }
        if (user.userType === 'TEACHER' || user.userType === 'ADMIN') {
            await user.populate('room').execPopulate()
        } else if (user.userType === 'STUDENT') {
            await user.populate('homeroom').execPopulate()
        }
        res.send(user)
    } catch (e) {
        res.send({error: "User not found"})
    }
})

router.get('/students', teacherAuth, async (req, res) => {
// router.get('/students', async (req, res) => {
    try {
        const students = await User.find({userType: 'STUDENT'})
            .sort({homeroomTeacher: 'asc'})
            .populate({path: 'homeroom', select: '_id id firstName lastName email userType'})
        res.send(students);
    } catch (e) {
        res.send({error: "Failed to get students"})
    }
})

router.get('/teachers', auth, async (req, res) => {
    try {
        const teachers = await User.find({$or: [{userType: 'TEACHER'}, {userType: 'ADMIN'}]})
            .sort({lastName: 'asc', firstName: 'asc'})
            .populate('room')

        res.send(teachers)

    } catch (e) {
        res.send({error: "Failed to get teachers"})
    }
})
// GET {{url}}/users
// GET {{url}}/users?limit=10&skip=10
router.get('/users', teacherAuth, async (req, res) => {
// router.get('/users', async (req, res) => {
    try {
        const users = await User.find({})
            .limit(parseInt(req.query.limit))
            .skip(parseInt(req.query.skip))
            .populate({path: 'homeroom', select: '_id id firstName lastName email userType'})
            .populate({path: 'room'})
        res.send(users);
    } catch (e) {
        res.send({error: "Failed to get users"})
    }
})


// // dev create user
// router.post('/users', async (req, res) => {
//
//     const user = new User(req.body)
//     try {
//         await user.save()
//         const token = await user.generateAuthToken()
//         res.status(201).send({user, token})
//     } catch (e) {
//         res.status(400).send(e)
//     }
// })
//
// // dev code
// router.get('/updateStudentPasswordId', async (req, res) => {
//     try {
//         const students = await User.find({userType: 'STUDENT'})
//         students.map(async (student) => {
//             student.password = student.id
//             await student.save()
//         })
//
//         res.status(200).send()
//     } catch (e) {
//         res.status(400).send(e)
//     }
// })
//
// // dev code
// router.get('/updateTeacherPassword/:password', async (req, res) => {
//     try {
//         const teachers = await User.find({userType: 'TEACHER'})
//         teachers.map(async (teacher) => {
//             teacher.password = req.params.password
//             await teacher.save()
//         })
//
//         res.status(200).send()
//     } catch (e) {
//         res.status(400).send(e)
//     }
// })


module.exports = router
