const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    totalSeats: {
        type: Number,
        required: true
    },
    availableSeats: {
        type: Number,
        required: true
    },
    ticketPrice: {
        type: Number,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    backgroundType: {
        type: String,
        enum: ['default', 'image', 'video'],
        default: 'default'
    },
    backgroundImage: {
        type: String,
        default: ''
    },
    backgroundVideo: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Invite', inviteSchema);