const mongoose = require('mongoose')

const locationSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        trim: true,
    },
    room: {
        type: String,
        required: true,
        trim: true,
    },
    originOnly: {
        type: Boolean,
        default: false
    },
    destinationOnly: {
        type: Boolean,
        default: false
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})

locationSchema.virtual('teachers', {
    ref: 'User',
    localField: 'id',
    foreignField: 'teacherLocation'
})

locationSchema.methods.locationRequireApproval = async function (){
    const location = this
    await location.populate('teachers').execPopulate()
    const locObject = location.toObject()
    return locObject.teachers.length > 0;
}

const Location = mongoose.model('Location', locationSchema)

module.exports = Location
