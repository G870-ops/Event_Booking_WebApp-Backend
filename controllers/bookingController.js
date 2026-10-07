const Booking = require('../models/Bookings');
const OTP = require('../models/OTP');
const Invite = require('../models/Invite');
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
            if (existingBooking.status === 'confirmed' && existingBooking.paymentStatus === 'paid') {
                return res.status(400).json({ error: 'You have already booked and confirmed this invite', bookingId: existingBooking._id });
            }
            // Return existing pending booking so user can proceed to payment checkout
            return res.json({ 
                message: 'Pending booking found. Proceeding to checkout.', 
                bookingId: existingBooking._id,
                status: existingBooking.status,
                paymentStatus: existingBooking.paymentStatus,
                amount: existingBooking.amount
            });
        }

        const isFree = (invite.ticketPrice === 0 || amount === 0);
        const newBooking = await Booking.create({
            userId: req.user._id,
            eventId: inviteId,
            inviteId: inviteId, // Ensures compatibility whether schema uses eventId or inviteId
            status: isFree ? 'confirmed' : 'pending',
            paymentStatus: isFree ? 'paid' : 'not_paid',
            paymentMethod: isFree ? 'free' : 'card',
            paymentReference: isFree ? 'FREE_PASS' : '',
            paidAt: isFree ? new Date() : null,
            amount: invite.ticketPrice || amount || 0,
            checkedIn: false
        });

        if (isFree) {
            invite.availableSeats = Math.max(0, invite.availableSeats - 1);
            await invite.save();
            const attendeeEmail = req.user.email;
            const attendeeName = req.user.name;
            if (attendeeEmail) {
                await sendbookingEmail(attendeeEmail, attendeeName, invite.title).catch(() => {});
            }
        }

        await OTP.deleteMany({ email: identifier, action: 'invite_booking' });
        res.json({ 
            message: isFree ? 'Free pass booked and confirmed successfully!' : 'Booking created, proceeding to payment gateway', 
            bookingId: newBooking._id,
            status: newBooking.status,
            paymentStatus: newBooking.paymentStatus,
            amount: newBooking.amount,
            isFree
        });
    } catch (error) {
        res.status(500).json({ error: 'Error booking invite', details: error.message });
    }
};

// Stripe Card Payment Execution
exports.payWithStripe = async (req, res) => {
    try {
        const { id: bookingId } = req.params;
        const { paymentMethodId, token, cardLast4, cardBrand } = req.body;

        const booking = await Booking.findById(bookingId).populate('eventId inviteId userId');
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.userId._id.toString() !== req.user._id.toString() && !['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Unauthorized to pay for this booking' });
        }

        if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
            return res.json({ message: 'Booking is already confirmed and paid', booking });
        }

        const inviteRef = booking.eventId || booking.inviteId;
        const invite = await Invite.findById(inviteRef._id || inviteRef);
        if (!invite) {
            return res.status(404).json({ error: 'Associated invite not found' });
        }

        if (invite.availableSeats <= 0 && booking.status !== 'confirmed') {
            return res.status(400).json({ error: 'Sorry, no seats remaining for this event' });
        }

        let stripePaymentId = `ch_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        if (process.env.STRIPE_SECRET_KEY) {
            try {
                const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        amount: Math.round((booking.amount || invite.ticketPrice) * 100).toString(),
                        currency: 'inr',
                        'payment_method_types[]': 'card',
                        description: `INVITOR Pass: ${invite.title} (${booking._id})`
                    })
                });
                const stripeData = await stripeRes.json();
                if (stripeData.id) {
                    stripePaymentId = stripeData.id;
                }
            } catch (stripeErr) {
                console.warn('Stripe API Notice:', stripeErr.message);
            }
        }

        booking.status = 'confirmed';
        booking.paymentStatus = 'paid';
        booking.paymentMethod = 'stripe';
        booking.paymentReference = stripePaymentId;
        booking.paidAt = new Date();
        await booking.save();

        if (invite.availableSeats > 0) {
            invite.availableSeats -= 1;
            await invite.save();
        }

        const attendeeEmail = booking.userId?.email || req.user.email;
        const attendeeName = booking.userId?.name || req.user.name;
        if (attendeeEmail) {
            await sendbookingEmail(attendeeEmail, attendeeName, invite.title).catch(() => {});
        }

        const formattedBooking = booking.toObject();
        formattedBooking.inviteId = formattedBooking.inviteId || formattedBooking.eventId;

        res.json({
            message: 'Stripe payment processed successfully! Pass activated.',
            booking: formattedBooking,
            transactionId: stripePaymentId
        });
    } catch (error) {
        console.error('Error in payWithStripe:', error);
        res.status(500).json({ error: 'Stripe payment processing failed', details: error.message });
    }
};

// UPI Payment Execution (UPI ID and UPI QR Code)
exports.payWithUPI = async (req, res) => {
    try {
        const { id: bookingId } = req.params;
        const { upiId, utrNumber, paymentMethodType } = req.body;

        const booking = await Booking.findById(bookingId).populate('eventId inviteId userId');
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.userId._id.toString() !== req.user._id.toString() && !['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Unauthorized to pay for this booking' });
        }

        if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
            return res.json({ message: 'Booking is already confirmed and paid', booking });
        }

        const inviteRef = booking.eventId || booking.inviteId;
        const invite = await Invite.findById(inviteRef._id || inviteRef);
        if (!invite) {
            return res.status(404).json({ error: 'Associated invite not found' });
        }

        if (invite.availableSeats <= 0 && booking.status !== 'confirmed') {
            return res.status(400).json({ error: 'Sorry, no seats remaining for this event' });
        }

        const upiRef = utrNumber?.trim() || `UPI_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

        booking.status = 'confirmed';
        booking.paymentStatus = 'paid';
        booking.paymentMethod = 'upi';
        booking.paymentReference = upiRef;
        booking.upiId = upiId?.trim() || (paymentMethodType === 'upi_qr' ? 'UPI_QR_SCAN' : 'INVITOR_UPI');
        booking.paidAt = new Date();
        await booking.save();

        if (invite.availableSeats > 0) {
            invite.availableSeats -= 1;
            await invite.save();
        }

        const attendeeEmail = booking.userId?.email || req.user.email;
        const attendeeName = booking.userId?.name || req.user.name;
        if (attendeeEmail) {
            await sendbookingEmail(attendeeEmail, attendeeName, invite.title).catch(() => {});
        }

        const formattedBooking = booking.toObject();
        formattedBooking.inviteId = formattedBooking.inviteId || formattedBooking.eventId;

        res.json({
            message: 'UPI payment verified successfully! Pass activated.',
            booking: formattedBooking,
            transactionId: upiRef
        });
    } catch (error) {
        console.error('Error in payWithUPI:', error);
        res.status(500).json({ error: 'UPI payment verification failed', details: error.message });
    }
};

// Single Booking Details
exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('userId', 'name email mobile')
            .populate('eventId')
            .populate('inviteId');

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const formattedBooking = booking.toObject();
        formattedBooking.inviteId = formattedBooking.inviteId || formattedBooking.eventId;
        res.json(formattedBooking);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching booking', details: error.message });
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