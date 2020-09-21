const express = require('express')
const User = require('../models/userModel')
const auth = require('../middleware/auth')
const teacherAuth = require("../middleware/teacherAuth");
const adminAuth = require("../middleware/adminAuth");
const router = new express.Router()

router.post('/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const {token, expires} = await user.generateAuthToken()
        res.send({user, token, expires})
    } catch (e) {
        res.status(400).send()
    }
})


router.post('/studentQrLogin/:qrString',async (req, res) => {
    try {
        const student = await User.findStudentByQrAndId(req.params.qrString, req.body.id)
        const {token, expires} = await student.generateAuthToken()
        res.send({user:student, token, expires})
    } catch (e) {
        res.status(400).send()
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
        res.status(500).send()
    }
})

router.get('/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send({success: "Logged out"})
    } catch (e) {
        res.status(500).send()
    }
})

// production create user
router.post('/users', adminAuth, async (req, res) => {

    const user = new User(req.body)
    try {
        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({user, token})
    } catch (e) {
        res.status(400).send(e)
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
            res.status(400).send({error: 'Invalid updates!'})
        }

        const user = await User.findOne({_id: req.params.id})
        if (!user) {
            res.status(404).send()
        }
        updateFields.forEach((updateField) => {
            user[updateField] = req.body[updateField]
        })
        await user.save()
        res.send(user)

    } catch (e) {
        res.status(400).send(e)
    }
})

// get user
router.get('/users/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findOne({_id: req.params.id})
        if (!user) {
            res.status(404).send({error: "User not found"})
        }
        if(user.userType==='TEACHER' || user.userType==='ADMIN'){
            await user.populate('room').execPopulate()
        } else if(user.userType==='STUDENT'){
            await user.populate('homeroom').execPopulate()
        }
        res.send(user)

    } catch (e) {
        console.log(e)
        res.status(400).send({error: ""})
    }
})

// router.get('/students', teacherAuth, async (req, res) => {
router.get('/students', async (req, res) => {
    try {
        const students = await User.find({userType: 'STUDENT'})
            .sort({homeroomTeacher: 'asc'})
            .populate({path:'homeroom', select: '_id id firstName lastName email userType'})
        res.send(students);
    } catch (e) {
        res.status(400).send(e)
    }
})

router.get('/teachers', auth, async (req, res) => {
    try {
        const teachers = await User.find({$or: [{userType: 'TEACHER'}, {userType: 'ADMIN'}]})
            .populate('room')

        res.send(teachers)

    } catch (e) {
        res.status(400).send(e)
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
            .populate({path:'homeroom', select: '_id id firstName lastName email userType'})
            .populate({path:'room'})
        res.send(users);
    } catch (e) {
        res.status(400).send(e)
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
