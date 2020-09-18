const express = require('express')
const User = require('../models/userModel')
const Pass = require('../models/passModel')
const Location = require('../models/locationModel')
const auth = require('../middleware/auth')
const teacherAuth = require("../middleware/teacherAuth");
const adminAuth = require("../middleware/adminAuth");
const router = new express.Router()


module.exports = router


router.get('/destinations', auth, async (req, res) => {
    try {
        const results = await Location.find({
            $or: [{destinationOnly: true}, {$and: [{originOnly: false}, {destinationOnly: false}]}]
        }).populate('teachers')
        res.send(results)

    } catch (e) {
        res.status(400).send(e)
    }
})

router.get('/origins', auth, async (req, res) => {
    try {
        const results = await Location.find({
            $or: [{originOnly: true}, {$and: [{originOnly: false}, {destinationOnly: false}]}]
        }).populate('teachers')
        res.send(results)

    } catch (e) {
        res.status(400).send(e)
    }
})
