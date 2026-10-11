const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema({
    upiId: {
        type: String,
        default: 'invitor.official@okaxis',
        trim: true
    },
    merchantName: {
        type: String,
        default: 'INVITOR Events Official',
        trim: true
    },
    qrCodeUrl: {
        type: String,
        default: '',
        trim: true
    },
    stripeEnabled: {
        type: Boolean,
        default: true
    },
    upiEnabled: {
        type: Boolean,
        default: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
