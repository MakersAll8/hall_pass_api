const mongoose = require('mongoose')
const Location = require('./locationModel')

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
                'RETURNED_ORIGIN', 'SENT_ELSEWHERE', 'PERMANENT_VOID'
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
        if (pass.isModified('originTeacher')) {
            console.log('Mock Sending Email to Origin Teacher')
        }
        const destination = await Location.findOne({_id: pass.destination})
        if (await destination.locationRequireApproval() && pass.isModified('destinationTeacher')) {
            console.log('Mock Sending Email to Destination Teacher')
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
    const lastIndexOrigin = originStatuses.length - 1;

    const destination = await Location.findOne({_id: pass.destination})
    if (await destination.locationRequireApproval()) {
        // get a list of destination statuses
        const destinationStatuses = pass.statuses.filter((status) => {
            return status.location.toString() === 'DESTINATION'
        })
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
