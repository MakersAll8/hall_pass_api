const mongoose = require('mongoose')
const Location = require('./locationModel')
const User = require('./userModel')
const email = require('../email/email')

const passSchema = new mongoose.Schema({
    createTime: {
        type: Date,
        default: Date.now,
        required: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    destination: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true,
    },
    origin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true,
    },
    destinationTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    originTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    accessPin: {
        type: String,
        required: true,
        unique: true,
    },
    statuses: [{
        action: {
            type: String,
            enum: [
                'ORIGIN_APPROVED', 'ORIGIN_DENIED',
                'DESTINATION_APPROVED', 'DESTINATION_DENIED',
                'ARRIVED_DESTINATION', 'DEPARTED_DESTINATION',
                'RETURNED_ORIGIN', 'SENT_ELSEWHERE', 'VOID'
            ],
            required: true,
        },
        location: {
            type: String,
            enum: [
                'ORIGIN', 'DESTINATION'
            ],
        },
        reviewTeacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        actionTime: {
            type: Date,
            default: Date.now,
            required: true,
        }
    }],

})

// Hash the plain text password before saving
passSchema.pre('save', async function (next) {
    try {
        const pass = this
        const student = await User.findOne({_id: pass.student})
        const origin = await Location.findOne({_id: pass.origin})
        const originTeacher = await User.findOne({_id: pass.originTeacher})
        const destination = await Location.findOne({_id: pass.destination})
        let destinationTeacher = null
        if(pass.destinationTeacher){
            destinationTeacher = await User.findOne({_id: pass.destinationTeacher})
        }

        if (pass.isModified('originTeacher')) {

            const approveLink = `${process.env.API_URL}/addStatus/${pass.accessPin}/${originTeacher._id}/ORIGIN_APPROVED/ORIGIN`
            const denyLink = `${process.env.API_URL}/addStatus/${pass.accessPin}/${originTeacher._id}/ORIGIN_DENIED/ORIGIN`
            const returnLink = `${process.env.API_URL}/addStatus/${pass.accessPin}/${originTeacher._id}/RETURNED_ORIGIN/ORIGIN`

            let message = `<p>Dear ${originTeacher.firstName}, you just received a hall pass request from ${student.firstName} ${student.lastName}</p>`
            message += `<p>Create Time: ${pass.createTime}</p>`
            message += `<p>Grade: ${student.grade}</p>`
            message += `<p>Origin: ${origin.room}</p>`
            message += `<p>Destination: ${destination.room}</p>`
            destinationTeacher ? message += `<p>Destination Teacher: ${destinationTeacher.firstName} ${destinationTeacher.lastName}</p>` : null
            message += `<p><a href='${approveLink}'><button
                  style='background-color: #4CAF50; border: none;
                  color: white;
                  padding: 15px 32px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 16px;'>Approve</button></a></p>`
            message += `<p><a href='${denyLink}'><button 
                  style='background-color: #f44336; border: none;
                  color: white;
                  padding: 15px 32px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 16px;'>Deny</button></a></p>`
            message += `<p><a href='${returnLink}'><button 
                  style='background-color: #008CBA; border: none;
                  color: white;
                  padding: 15px 32px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 16px;'>Return to Class</button></a></p>`


            await email("metrics@xiao.engineer", 'You received a hall pass request', message)
        }

        // destination approval is required
        if (await destination.locationRequireApproval() && pass.isModified('destinationTeacher')) {
            const approveLink = `${process.env.API_URL}/addStatus/${pass.accessPin}/${destinationTeacher._id}/DESTINATION_APPROVED/DESTINATION`
            const denyLink = `${process.env.API_URL}/addStatus/${pass.accessPin}/${destinationTeacher._id}/DESTINATION_DENIED/DESTINATION`
            const arrivedLink = `${process.env.API_URL}/addStatus/${pass.accessPin}/${destinationTeacher._id}/ARRIVED_DESTINATION/DESTINATION`
            const departedLink = `${process.env.API_URL}/addStatus/${pass.accessPin}/${destinationTeacher._id}/DEPARTED_DESTINATION/DESTINATION`
            const elsewhereLink = `${process.env.API_URL}/addStatus/${pass.accessPin}/${destinationTeacher._id}/SENT_ELSEWHERE/DESTINATION`
            console.log(approveLink)
            // console.log('Mock Sending Email to Origin Teacher')
            let message = `<p>Dear ${destinationTeacher.firstName}, you just received a visit request from ${student.firstName} ${student.lastName}</p>`
            message += `<p>Create Time: ${pass.createTime}</p>`
            message += `<p>Grade: ${student.grade}</p>`
            message += `<p>Origin: ${origin.room}</p>`
            message += `<p>Origin Teacher: ${originTeacher.firstName} ${originTeacher.lastName}</p>`
            message += `<p>Destination: ${destination.room}</p>`
            message += `<p><a href='${approveLink}'><button
                  style='background-color: #4CAF50; border: none;
                  color: white;
                  padding: 15px 32px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 16px;'>Approve</button></a></p>`
            message += `<p><a href='${denyLink}'><button 
                  style='background-color: #f44336; border: none;
                  color: white;
                  padding: 15px 32px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 16px;'>Deny</button></a></p>`
            message += `<p><a href='${arrivedLink}'><button 
                  style='background-color: #008CBA; border: none;
                  color: white;
                  padding: 15px 32px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 16px;'>Arrived in Destination</button></a></p>`
            message += `<p><a href='${departedLink}'><button 
                  style='background-color: #008CBA; border: none;
                  color: white;
                  padding: 15px 32px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 16px;'>Departed for Origin</button></a></p>`
            message += `<p><a href='${elsewhereLink}'><button 
                  style='background-color: #008CBA; border: none;
                  color: white;
                  padding: 15px 32px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 16px;'>Sent Elsewhere</button></a></p>`

            await email("metrics@xiao.engineer", 'You received a visit request', message)
        }
    } catch (e) {
        console.log(e)
    }
    next()
})

passSchema.methods.isActive = async function () {
    const pass = this;
    const now = new Date()
    const start = new Date(pass.createTime.getTime())
    const end = new Date(pass.createTime.getTime())
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 99)

    // active passes are created today
    if (!(now >= start && now <= end)) {
        return false;
    }
    // console.log(pass.statuses.length);
    if(pass.statuses.length === 0){
        return false;
    }

    // get a list of origin statuses
    const originStatuses = pass.statuses.filter((status) => {
        return status.location.toString() === 'ORIGIN'
    })
    if(originStatuses.length === 0){
        return false;
    }
    const lastIndexOrigin = originStatuses.length - 1;

    const destination = await Location.findOne({_id: pass.destination})
    if (await destination.locationRequireApproval()) {
        // get a list of destination statuses
        const destinationStatuses = pass.statuses.filter((status) => {
            return status.location.toString() === 'DESTINATION'
        })
        if(destinationStatuses.length === 0){
            return false;
        }
        const lastIndexDestination = destinationStatuses.length - 1
        // last action from origin is ORIGIN_APPROVED
        // AND last action from destination is DESTINATION_APPROVED OR DEPARTED_DESTINATION
        return (originStatuses[lastIndexOrigin].action.toString() === 'ORIGIN_APPROVED')
            && (destinationStatuses[lastIndexDestination].action.toString() === 'DESTINATION_APPROVED'
                || destinationStatuses[lastIndexDestination].action.toString() === 'DEPARTED_DESTINATION');

    } else {
        // last action from origin is ORIGIN_APPROVED
        return originStatuses[lastIndexOrigin].action.toString() === 'ORIGIN_APPROVED';
    }
}

passSchema.methods.addStatus = async function (action, location, reviewTeacher) {
    const pass = this;
    const now = Date.now();

    // validate action/location pair
    if (location === 'ORIGIN') {
        const validActions = [
            'ORIGIN_APPROVED', 'ORIGIN_DENIED',
            'RETURNED_ORIGIN', 'PERMANENT_VOID'
        ];
        if (!validActions.includes(action)) {
            throw Error("invalid action for origin")
        }

        if(reviewTeacher !== pass.originTeacher.toString()){
            throw Error("Review teacher is not nominated as the origin")
        }

    } else if (location === 'DESTINATION') {
        const validActions = [
            'DESTINATION_APPROVED', 'DESTINATION_DENIED',
            'ARRIVED_DESTINATION', 'DEPARTED_DESTINATION',
            'SENT_ELSEWHERE', 'PERMANENT_VOID'
        ];
        if (!validActions.includes(action)) {
            throw Error("invalid action for destination")
        }

        if(!pass.destinationTeacher || reviewTeacher !== pass.destinationTeacher.toString()){
            console.log(reviewTeacher, pass.destinationTeacher)
            throw Error("Review teacher is not nominated as the destination")
        }
    } else {
        throw Error("invalid location")
    }

    const teacherId = mongoose.Types.ObjectId(reviewTeacher)
    const teacherAction = {action: action, location: location, reviewTeacher: teacherId, actionTime: now}
    pass.statuses.push(teacherAction);
    await pass.save()
    return pass
}

const Pass = mongoose.model('Pass', passSchema)

module.exports = Pass
