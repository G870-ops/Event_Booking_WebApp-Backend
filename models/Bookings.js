const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invite' }, // Added back for backward compatibility with old data
    inviteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invite' },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
    paymentStatus: { type: String, enum: ['paid', 'unpaid', 'refunded'], default: 'paid' },
    amount: { type: Number, default: 0 },
    // ADD THIS FIELD FOR GATE PASSED / SCANNER VERIFICATION
    checkedIn: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
