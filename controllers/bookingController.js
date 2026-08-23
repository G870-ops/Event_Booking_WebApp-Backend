const Booking = require('../models/Bookings');
const OTP = require('../models/OTP');
const Invite = require('../models/Invite');
const { sendOTPEmail, sendbookingEmail } = require('../utils/email');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.sendBookingOTP = async (req, res) => {
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
};

exports.bookInvite = async (req, res) => {
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

    const existingBooking = await Booking.findOne({ userId: req.user._id, eventId: inviteId });
    if (existingBooking) {
        return res.status(400).json({ error: 'You have already booked this invite' });
    }

    const newBooking = await Booking.create({
        userId: req.user._id,
        eventId: inviteId,
        status: 'pending',
        paymentStatus: 'not_paid',
        amount: invite.ticketPrice
    });

    await OTP.deleteMany({ email: identifier, action: 'invite_booking' });
    res.json({ message: 'Booking created, please check your verification status/payment instructions', bookingId: newBooking._id });
};

exports.confirmBooking = async (req, res) => {
    const paymentStatus = req.body.paymentStatus;
    if (!['paid', 'not_paid'].includes(paymentStatus)) {
        return res.status(400).json({ error: 'Invalid payment status' });
    }
    const bookingInstance = await Booking.findById(req.params.id).populate('userId').populate('eventId');
    if (!bookingInstance) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    if (bookingInstance.status === 'confirmed') {
        return res.status(400).json({ error: 'Booking is already confirmed' });
    }

    const invite = await Invite.findById(bookingInstance.eventId._id);
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

    // admin confirms booking, send email to user
    if (bookingInstance.userId.email) {
        await sendbookingEmail(bookingInstance.userId.email, bookingInstance.userId.name, invite.title);
    }

    res.json({ message: 'Booking confirmed' });
};

exports.getMyBookings = async (req, res) => {
    let bookings;
    if (req.user && req.user.role === 'admin') {
        bookings = await Booking.find({}).populate('userId').populate('eventId');
    } else {
        bookings = await Booking.find({ userId: req.user._id }).populate('eventId');
    }
    
    const formattedBookings = bookings.map(b => {
        const obj = b.toObject();
        obj.inviteId = obj.eventId;
        return obj;
    });
    res.json(formattedBookings);
};

exports.cancelBooking = async (req, res) => {
    const bookingInstance = await Booking.findById(req.params.id).populate('eventId');
    if (!bookingInstance) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    // Admins can cancel any booking, users can only cancel their own
    if (req.user.role !== 'admin' && bookingInstance.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const wasConfirmed = bookingInstance.status === 'confirmed';
    bookingInstance.status = 'cancelled';
    await bookingInstance.save();

    if (wasConfirmed) {
        const invite = await Invite.findById(bookingInstance.eventId._id);
        if (invite) {
            invite.availableSeats += 1;
            await invite.save();
        }
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking cancelled' });
};
