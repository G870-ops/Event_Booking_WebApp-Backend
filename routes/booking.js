const express = require('express');
const router = express.Router();

const { protect, admin } = require('../middleware/auth');
const {
    bookInvite,
    sendBookingOTP,
    getMyBookings,
    getBookingById,
    payWithStripe,
    payWithUPI,
    confirmBooking,
    cancelBooking,
    checkInGatePass
} = require('../controllers/bookingController');

router.post('/', protect, bookInvite);
router.post('/send-otp', protect, sendBookingOTP);
router.get('/my', protect, getMyBookings);
router.get('/:id', protect, getBookingById);
router.post('/:id/pay-stripe', protect, payWithStripe);
router.post('/:id/pay-upi', protect, payWithUPI);
router.put('/verify-gatepass', protect, checkInGatePass);
router.put('/:id/confirm', protect, admin, confirmBooking);
router.delete('/:id', protect, cancelBooking);

module.exports = router;