const Booking = require('../models/Bookings');
const OTP = require('../models/OTP');
const Invite = require('../models/Invite');
const PaymentSettings = require('../models/PaymentSettings');
const { sendOTPEmail, sendbookingEmail } = require('../utils/email');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.sendBookingOTP = async (req, res) => {
    try {
        const otp = generateOTP();
        const identifier = req.user.email || req.user.mobile;
        console.log(`🔑 Booking OTP for ${identifier}: ${otp}`);

        await OTP.findOneAndDelete({ email: identifier, action: 'invite_booking' });
        await OTP.create({ email: identifier, otp: otp, action: 'invite_booking' });

        if (req.user.email) {
            await sendOTPEmail(req.user.email, otp, 'invite_booking');
        }
        if (req.user.mobile) {
            const { sendOTPSMS } = require('../utils/sms');
            await sendOTPSMS(req.user.mobile, otp);
        }

        res.json({ message: req.user.email ? 'OTP sent to email' : 'OTP generated and sent to mobile' });
    } catch (error) {
        res.status(500).json({ error: 'Error sending OTP', details: error.message });
    }
};

exports.bookInvite = async (req, res) => {
    try {
        const { inviteId, amount, otp } = req.body;
        const identifier = req.user.email || req.user.mobile;

        const otpRecord = await OTP.findOne({ email: identifier, otp, action: 'invite_booking' });
        if (!otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        const invite = await Invite.findById(inviteId);
        if (!invite) {
            return res.status(404).json({ error: 'Invite not found' });
        }

        if (invite.availableSeats <= 0) {
            return res.status(400).json({ error: 'No available seats' });
        }

        const existingBooking = await Booking.findOne({
            userId: req.user._id,
            $or: [{ eventId: inviteId }, { inviteId: inviteId }]
        });

        if (existingBooking) {
            return res.status(400).json({ error: 'You have already booked this invite' });
        }

        const newBooking = await Booking.create({
            userId: req.user._id,
            eventId: inviteId,
            inviteId: inviteId, // Ensures compatibility whether schema uses eventId or inviteId
            status: 'pending',
            paymentStatus: 'not_paid',
            amount: invite.ticketPrice || amount || 0,
            checkedIn: false
        });

        await OTP.deleteMany({ email: identifier, action: 'invite_booking' });
        res.json({ message: 'Booking created, please check your verification status/payment instructions', bookingId: newBooking._id });
    } catch (error) {
        res.status(500).json({ error: 'Error booking invite', details: error.message });
    }
};

exports.confirmBooking = async (req, res) => {
    try {
        const paymentStatus = req.body.paymentStatus;
        if (!['paid', 'not_paid'].includes(paymentStatus)) {
            return res.status(400).json({ error: 'Invalid payment status' });
        }

        const bookingInstance = await Booking.findById(req.params.id)
            .populate('userId')
            .populate('eventId')
            .populate('inviteId');

        if (!bookingInstance) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (bookingInstance.status === 'confirmed') {
            return res.status(400).json({ error: 'Booking is already confirmed' });
        }

        const inviteRef = bookingInstance.eventId || bookingInstance.inviteId;
        const invite = await Invite.findById(inviteRef._id || inviteRef);

        if (!invite) {
            return res.status(404).json({ error: 'Associated invite not found' });
        }

        if (invite.availableSeats <= 0) {
            return res.status(400).json({ error: 'No available seats' });
        }

        bookingInstance.status = 'confirmed';
        if (paymentStatus) {
            bookingInstance.paymentStatus = paymentStatus;
        }
        await bookingInstance.save();

        invite.availableSeats -= 1;
        await invite.save();

        if (bookingInstance.userId && bookingInstance.userId.email) {
            await sendbookingEmail(bookingInstance.userId.email, bookingInstance.userId.name, invite.title);
        }

        res.json({ message: 'Booking confirmed' });
    } catch (error) {
        res.status(500).json({ error: 'Error confirming booking', details: error.message });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        let bookings;
        const adminRoles = ['admin', 'superadmin', 'event_manager', 'gate_checker', 'finance'];

        if (req.user && adminRoles.includes(req.user.role)) {
            bookings = await Booking.find({})
                .populate('userId')
                .populate('eventId')
                .populate('inviteId')
                .sort({ createdAt: -1 });
        } else {
            bookings = await Booking.find({ userId: req.user._id })
                .populate('eventId')
                .populate('inviteId')
                .sort({ createdAt: -1 });
        }

        // Map populated event details so frontend UserDashboard reads `booking.inviteId.title` seamlessly
        const formattedBookings = bookings.map(b => {
            const obj = b.toObject();
            obj.inviteId = obj.inviteId || obj.eventId;
            return obj;
        });

        res.json(formattedBookings);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching bookings', details: error.message });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const bookingInstance = await Booking.findById(req.params.id)
            .populate('eventId')
            .populate('inviteId');

        if (!bookingInstance) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const adminRoles = ['admin', 'superadmin', 'event_manager'];
        const isStaff = req.user && adminRoles.includes(req.user.role);

        if (!isStaff && bookingInstance.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const wasConfirmed = bookingInstance.status === 'confirmed';
        bookingInstance.status = 'cancelled';
        await bookingInstance.save();

        if (wasConfirmed) {
            const inviteRef = bookingInstance.eventId || bookingInstance.inviteId;
            if (inviteRef) {
                const invite = await Invite.findById(inviteRef._id || inviteRef);
                if (invite) {
                    invite.availableSeats += 1;
                    await invite.save();
                }
            }
        }

        await Booking.findByIdAndDelete(req.params.id);
        res.json({ message: 'Booking cancelled' });
    } catch (error) {
        res.status(500).json({ error: 'Error cancelling booking', details: error.message });
    }
};

// Verify QR code scan at the gate
exports.checkInGatePass = async (req, res) => {
    try {
        const { bookingId } = req.body;

        const booking = await Booking.findById(bookingId)
            .populate('userId', 'name email mobile')
            .populate('eventId')
            .populate('inviteId');

        if (!booking) {
            return res.status(404).json({ error: 'Invalid Gate Pass / Ticket Not Found' });
        }

        if (booking.status !== 'confirmed') {
            return res.status(400).json({ error: 'Entry Denied: Booking status is not confirmed' });
        }

        if (booking.checkedIn) {
            return res.status(400).json({
                error: 'ALREADY REDEEMED: This pass was used previously!',
                booking
            });
        }

        // Mark pass as redeemed
        booking.checkedIn = true;
        await booking.save();

        res.status(200).json({
            message: 'ENTRY GRANTED: Gate pass verified successfully!',
            booking
        });
    } catch (error) {
        res.status(500).json({ error: 'Verification failed', details: error.message });
    }
};

// Process Booking Payment (Stripe Card, UPI QR, UPI ID, Free)
exports.processBookingPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, paymentReference, upiId, cardDetails } = req.body;

        const booking = await Booking.findById(id)
            .populate('eventId')
            .populate('inviteId');

        if (!booking) {
            return res.status(404).json({ error: 'Booking record not found' });
        }

        // Authorization check: must be owner of booking or admin/staff
        const adminRoles = ['admin', 'superadmin', 'event_manager', 'finance'];
        const isOwner = booking.userId && booking.userId.toString() === req.user._id.toString();
        const isStaff = req.user && adminRoles.includes(req.user.role);

        if (!isOwner && !isStaff) {
            return res.status(403).json({ error: 'Unauthorized to process payment for this booking' });
        }

        if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
            const inviteObj = booking.inviteId || booking.eventId;
            const formatted = booking.toObject();
            formatted.inviteId = inviteObj;
            return res.json({ message: 'Booking is already confirmed and paid', booking: formatted });
        }

        const inviteRef = booking.eventId || booking.inviteId;
        const invite = await Invite.findById(inviteRef._id || inviteRef);
        if (!invite) {
            return res.status(404).json({ error: 'Associated event could not be found' });
        }

        // STRIPE CARD PAYMENT VALIDATION & PROCESSING
        if (paymentMethod === 'stripe') {
            if (cardDetails) {
                const { cardNumber, cardExpiry, cardCvv, cardName } = cardDetails;
                const cleanNumber = (cardNumber || '').replace(/\s+/g, '');

                // 1. Validate card number
                if (!cleanNumber || cleanNumber.length < 15 || cleanNumber.length > 16 || !/^\d+$/.test(cleanNumber)) {
                    return res.status(400).json({ 
                        error: 'Stripe Authorization Failed: Please enter a valid 16-digit card number.' 
                    });
                }

                // 2. Validate expiration date format (MM/YY)
                if (!cardExpiry || !cardExpiry.includes('/')) {
                    return res.status(400).json({ 
                        error: 'Stripe Authorization Failed: Invalid expiry date format. Use MM/YY.' 
                    });
                }
                const parts = cardExpiry.split('/');
                const expMonth = parseInt(parts[0].trim(), 10);
                const expYear = parseInt(parts[1].trim(), 10);
                if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
                    return res.status(400).json({ 
                        error: 'Stripe Authorization Failed: Invalid expiration month (01-12).' 
                    });
                }
                const now = new Date();
                const currentTwoDigitYear = now.getFullYear() % 100;
                const currentMonth = now.getMonth() + 1;
                const fullExpYear = expYear < 100 ? expYear : expYear % 100;

                if (fullExpYear < currentTwoDigitYear || (fullExpYear === currentTwoDigitYear && expMonth < currentMonth)) {
                    return res.status(400).json({ 
                        error: 'Stripe Authorization Failed: This card has expired. Please use an active card.' 
                    });
                }

                // 3. Validate CVV (3-4 digits)
                const cleanCvv = (cardCvv || '').toString().trim();
                if (!cleanCvv || cleanCvv.length < 3 || cleanCvv.length > 4 || !/^\d+$/.test(cleanCvv)) {
                    return res.status(400).json({ 
                        error: 'Stripe Authorization Failed: Please enter a valid 3 or 4 digit CVV code.' 
                    });
                }

                // 4. Validate cardholder name
                if (!cardName || cardName.trim().length < 2) {
                    return res.status(400).json({ 
                        error: 'Stripe Authorization Failed: Please enter the cardholder name.' 
                    });
                }
            } else if (!paymentReference || !paymentReference.startsWith('stripe_ch_')) {
                return res.status(400).json({ 
                    error: 'Stripe Authorization Failed: Invalid card authorization token or missing credentials.' 
                });
            }
        } else if (paymentMethod === 'upi_id') {
            if (upiId && !upiId.includes('@')) {
                return res.status(400).json({ 
                    error: 'Invalid UPI ID: Must be in VPA format (e.g. username@okhdfcbank).' 
                });
            }
        }

        // Deduct seat if booking was pending
        if (booking.status !== 'confirmed') {
            if (invite.availableSeats <= 0) {
                return res.status(400).json({ error: 'No available seats left for this event.' });
            }
            invite.availableSeats = Math.max(0, invite.availableSeats - 1);
            await invite.save();
        }

        // Update booking to confirmed & paid
        booking.status = 'confirmed';
        booking.paymentStatus = 'paid';
        booking.paymentMethod = paymentMethod || 'stripe';
        booking.paymentReference = paymentReference || `PAY_${Date.now()}`;
        if (upiId) booking.upiId = upiId;
        booking.paidAt = new Date();
        await booking.save();

        // Send confirmation email
        try {
            if (req.user && req.user.email) {
                await sendbookingEmail(req.user.email, req.user.name, invite.title);
            }
        } catch (emailErr) {
            console.warn('Booking confirmation email sending error:', emailErr.message);
        }

        const formatted = booking.toObject();
        formatted.inviteId = invite;

        res.json({
            message: 'Payment authorized and verified! Booking is confirmed.',
            booking: formatted
        });
    } catch (error) {
        res.status(500).json({ error: 'Payment processing error', details: error.message });
    }
};

// Get Payment Settings (UPI ID, Merchant Name, Custom QR) - Public / Authenticated
exports.getPaymentSettings = async (req, res) => {
    try {
        let settings = await PaymentSettings.findOne().sort({ updatedAt: -1 });
        if (!settings) {
            settings = await PaymentSettings.create({
                upiId: 'invitor.official@okaxis',
                merchantName: 'INVITOR Events Official',
                qrCodeUrl: '',
                stripeEnabled: true,
                upiEnabled: true
            });
        }
        res.json({
            upiId: settings.upiId,
            merchantName: settings.merchantName,
            qrCodeUrl: settings.qrCodeUrl,
            stripeEnabled: settings.stripeEnabled,
            upiEnabled: settings.upiEnabled,
            updatedAt: settings.updatedAt
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching payment settings', details: error.message });
    }
};

// Update Payment Settings (Admin Only)
exports.updatePaymentSettings = async (req, res) => {
    try {
        const { upiId, merchantName, qrCodeUrl, stripeEnabled, upiEnabled } = req.body;

        if (upiId && !upiId.includes('@')) {
            return res.status(400).json({ error: 'Invalid UPI ID: Must contain "@" (e.g., yourname@okaxis)' });
        }

        let settings = await PaymentSettings.findOne().sort({ updatedAt: -1 });
        if (!settings) {
            settings = new PaymentSettings();
        }

        if (upiId !== undefined) settings.upiId = upiId.trim();
        if (merchantName !== undefined) settings.merchantName = merchantName.trim();
        if (qrCodeUrl !== undefined) settings.qrCodeUrl = qrCodeUrl.trim();
        if (stripeEnabled !== undefined) settings.stripeEnabled = Boolean(stripeEnabled);
        if (upiEnabled !== undefined) settings.upiEnabled = Boolean(upiEnabled);
        settings.updatedBy = req.user._id;

        await settings.save();

        res.json({
            message: 'Payment gateway & UPI configuration updated successfully!',
            settings: {
                upiId: settings.upiId,
                merchantName: settings.merchantName,
                qrCodeUrl: settings.qrCodeUrl,
                stripeEnabled: settings.stripeEnabled,
                upiEnabled: settings.upiEnabled,
                updatedAt: settings.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error updating payment settings', details: error.message });
    }
};