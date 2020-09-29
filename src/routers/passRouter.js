const express = require('express')
const User = require('../models/userModel')
const Pass = require('../models/passModel')
const Location = require('../models/locationModel')
const auth = require('../middleware/auth')
const teacherAuth = require("../middleware/teacherAuth");
const adminAuth = require("../middleware/adminAuth");
const {v4: uuidv4} = require('uuid');
const router = new express.Router()
const moment = require('moment-timezone')

router.post('/requestPass', auth, async (req, res) => {
    try {
        const now = new Date()
        const student = req.user._id
        const destination = req.body.destination
        const origin = req.body.origin
        const originTeacher = req.body.originTeacher
        const destinationTeacher = req.body.destinationTeacher
        const accessPin = uuidv4()

        const destinationInfo = await Location.findOne({_id: destination})
        if (await destinationInfo.locationRequireApproval() && !req.body.destinationTeacher) {
            throw Error("Destination teacher must be nominated")
        }

        const pass = new Pass({
            createTime: now,
            student,
            destination,
            origin,
            accessPin,
            originTeacher,
            destinationTeacher
        })
        await pass.save()
        await pass.populate('student').execPopulate()
        await pass.populate('origin').execPopulate()
        await pass.populate('destination').execPopulate()
        res.send(pass)
    } catch (e) {
        res.send({error: 'Failed to create a hall pass request'})
    }
})

router.patch('/updatePass/:id', teacherAuth, async (req, res) => {
    try {
        const passId = req.params.id
        const pass = await Pass.findOne({_id: passId})
        if (!pass) {
            return res.send({error: 'pass id not found'})
        }
        await updatePass(req, res, pass)
    } catch (e) {
        // console.log(e)
        res.send({error: 'Failed to update hall pass'})
    }
})

router.patch('/modifyPass/:id/:accessPin', async (req, res) => {
    try {
        const passId = req.params.id
        const pass = await Pass.findOne({_id: passId})
        if (!pass) {
            return res.send({error: 'pass not found'})
        }
        if (pass.accessPin !== req.params.accessPin) {
            return res.send({error: 'pass not found'})
        }
        await updatePass(req, res, pass)
    } catch (e) {
        // console.log(e)
        res.send({error: 'Failed to update hall pass'})
    }
})

const updatePass = async (req, res, pass)=>{
    try {
        const updateFields = Object.keys(req.body)
        const allowedUpdates = [
            'destination', 'origin', 'destinationTeacher', 'originTeacher'
        ]
        const isValidOperation = updateFields.every((update) => allowedUpdates.includes(update))

        if (!isValidOperation) {
            return res.send({error: 'Invalid updates!'})
        }

        if (req.body.origin) {
            const origin = await Location.findOne({_id: req.body.origin})
            if (!origin) {
                return res.send({error: 'origin id not found'})
            }
        }

        if (req.body.destination) {
            const destination = await Location.findOne({_id: req.body.destination})
            if (!destination) {
                return res.send({error: 'destination id not found'})
            }
        }

        // update field
        updateFields.forEach((updateField) => {
            pass[updateField] = req.body[updateField]
        })
        await pass.save()
        await pass.populate('destination').execPopulate()
        await pass.populate('origin').execPopulate()
        await pass.populate('originTeacher').execPopulate()
        if (await pass.destination.locationRequireApproval()) {
            await pass.populate('destinationTeacher').execPopulate()
        }

        res.send(pass)

    } catch (e) {
        // console.log(e)
        res.send({error: 'Failed to update hall pass'})
    }
}

router.get('/isPassActive/:id/:accessPin', async (req, res) => {
    try {
        const accessPin = req.params.accessPin
        const id = req.params.id
        const pass = await Pass.findOne({_id: id, accessPin})
        if(!pass){
            res.send({error: 'Failed to find a pass'})
            return
        }
        const active = await pass.isActive()
        await pass.populate('student').execPopulate()
        await pass.populate('destination').execPopulate()
        await pass.populate('origin').execPopulate()
        await pass.populate('originTeacher').execPopulate()
        await pass.populate('statuses.reviewTeacher').execPopulate()
        if(pass.destinationTeacher){
            await pass.populate('destinationTeacher').execPopulate()
        }

        res.send({active, ...pass.toJSON()})
    } catch (e) {
        console.log(e)
        res.send({error: 'Failed to find a pass'})
    }
})

router.get('/addStatus/:accessPin/:teacherId/:action/:locationType', async (req, res) => {
    try {

        const accessPin = req.params.accessPin
        const teacherId = req.params.teacherId
        const action = req.params.action
        const locationType = req.params.locationType

        const pass = await Pass.findOne({accessPin})
        await pass.addStatus(action, locationType, teacherId)

        res.send(pass)
    } catch (e) {
        console.log(e)
        res.send({error: 'Failed to add your decision to the pass'})
    }
})

router.get('/passes', auth, async (req, res) => {
    try {
        let passes = []
        if (req.user.userType === 'STUDENT') {
            passes = await Pass.find({student: req.user._id}, '')
                .sort({createTime: -1})
                .limit(parseInt(req.query.limit))
                .skip(parseInt(req.query.skip))
                .populate({path: 'student', select: '_id id firstName lastName email userType grade'})
                .populate({path: 'destination'})
                .populate({path: 'origin'})
                .populate({path: 'destinationTeacher', select: '_id id firstName lastName email userType'})
                .populate({path: 'originTeacher', select: '_id id firstName lastName email userType'})
                .populate({path: 'statuses.reviewTeacher', select: '_id id firstName lastName email userType'})
        } else if (req.user.userType === 'TEACHER' || req.user.userType === 'ADMIN') {
            passes = await Pass.find({})
                .sort({createTime: -1})
                .limit(parseInt(req.query.limit))
                .skip(parseInt(req.query.skip))
                .populate({path: 'student', select: '_id id firstName lastName email userType grade'})
                .populate({path: 'destination'})
                .populate({path: 'origin'})
                .populate({path: 'destinationTeacher', select: '_id id firstName lastName email userType'})
                .populate({path: 'originTeacher', select: '_id id firstName lastName email userType'})
                .populate({path: 'statuses.reviewTeacher', select: '_id id firstName lastName email userType'})
        }

        passes = await (async () => {
            const results = await Promise.all(passes.map(async (pass) => {
                return await pass.isActive()
            }))
            return passes.map((pass, index) => {
                return {
                    ...pass.toObject(),
                    active: results[index]
                }
            })
        })()

        return res.send(passes);



    } catch (e) {
        res.send(e)
    }
})

router.get('/activePasses', auth, async (req, res) => {
    try {
        const start = moment().tz(process.env.TIMEZONE).startOf('day').utc()
        const end = moment().tz(process.env.TIMEZONE).endOf('day').utc()

        let passes = []
        if (req.user.userType === 'STUDENT') {
            passes = await Pass.find({student: req.user._id, createTime: {$gte: start, $lte: end}})
                .sort({createTime: -1})
                .limit(parseInt(req.query.limit))
                .skip(parseInt(req.query.skip))
                .populate({path: 'student', select: '_id id firstName lastName email userType grade'})
                .populate({path: 'destination'})
                .populate({path: 'origin'})
                .populate({path: 'destinationTeacher', select: '_id id firstName lastName email userType'})
                .populate({path: 'originTeacher', select: '_id id firstName lastName email userType'})
                .populate({path: 'statuses.reviewTeacher', select: '_id id firstName lastName email userType'})

        } else if (req.user.userType === 'TEACHER' || req.user.userType === 'ADMIN') {
            passes = await Pass.find({createTime: {$gte: start, $lte: end}})
                .sort({createTime: -1})
                .limit(parseInt(req.query.limit))
                .skip(parseInt(req.query.skip))
                .populate({path: 'student', select: '_id id firstName lastName email userType grade'})
                .populate({path: 'destination'})
                .populate({path: 'origin'})
                .populate({path: 'destinationTeacher', select: '_id id firstName lastName email userType'})
                .populate({path: 'originTeacher', select: '_id id firstName lastName email userType'})
                .populate({path: 'statuses.reviewTeacher', select: '_id id firstName lastName email userType'})

        }

        // async map and async filter cannot cause side effects
        // you cannot update arrays from inside async map and async filter
        let actives = await (async () => {
            const results = await Promise.all(passes.map(async (pass) => {
                return await pass.isActive()
            }))
            return passes.filter((pass, index) => results[index])
        })()

        actives = actives.map(active=>{
            return {...active.toObject(), active: true}
        })

        return res.send(actives);


    } catch (e) {
        console.log(e)
        res.send({error: "Failed to get active passes"})
    }
})

module.exports = router


