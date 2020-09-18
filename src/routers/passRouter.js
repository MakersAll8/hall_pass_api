const express = require('express')
const User = require('../models/userModel')
const Pass = require('../models/passModel')
const Location = require('../models/locationModel')
const auth = require('../middleware/auth')
const teacherAuth = require("../middleware/teacherAuth");
const adminAuth = require("../middleware/adminAuth");
const router = new express.Router()

router.post('/requestPass', auth, async (req, res) => {

})

router.post('/createPass', teacherAuth, async (req, res) => {

})


module.exports = router


