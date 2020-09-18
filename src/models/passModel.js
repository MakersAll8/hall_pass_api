const mongoose = require('mongoose')

const passSchema = new mongoose.Schema({
    createTime: {
        type: Date,
        default: Date.now,
        required: true,
    },
    effectiveDates: [{
        effectiveDate : {
            type: Date,
            default: Date.now,
            required: true,
        }
    }],

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
    reviewTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    reviewTime: {
        type: Date,
    },
    accessPin: {
        type: String,
        required: true,
    },
    requireDestinationResponse: {
        type: Boolean,
        default: true,
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
        actionTime: {
            type: Date,
            default: Date.now,
            required: true,
        }
    }],

})

passSchema.statics.findByStudent = async (student) => {
    const passes = await User.find({student})
    if(!passes){
        throw new Error('Unable to find passes')
    }
    return passes;
}

const Pass = mongoose.model('Pass', passSchema)

module.exports = Pass
