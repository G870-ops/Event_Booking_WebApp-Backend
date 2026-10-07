/*const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: {
         type: mongoose.Schema.Types.ObjectId, 
         ref: 'User',
          required: true 
        },
    eventId: {
         type: mongoose.Schema.Types.ObjectId,
            ref: 'Invite',
                required: true
        },
        status: {
            type: String,
            enum: [ 'pending','confirmed', 'cancelled'],
            default: 'pending'
        },
        paymentStatus: {
            type: String,
            enum: ['not_paid', 'paid'],
            default: 'not_paid'
        },

        amount: {
            type: Number,
            required: true
        }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema); */


const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invite' }, // Added back for backward compatibility with old data
    inviteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invite' },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    paymentStatus: { type: String, enum: ['paid', 'unpaid', 'not_paid', 'refunded'], default: 'not_paid' },
    paymentMethod: { type: String, enum: ['stripe', 'upi', 'free', 'card', 'cash'], default: 'free' },
    paymentReference: { type: String, default: '' },
    upiId: { type: String, default: '' },
    paidAt: { type: Date },
    amount: { type: Number, default: 0 },
    // Gate pass scanner verification
    checkedIn: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
