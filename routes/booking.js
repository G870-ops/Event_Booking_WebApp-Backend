const express = require('express');
const router = express.Router();

const { protect, admin } = require('../middleware/auth');
const { bookInvite, sendBookingOTP, getMyBookings, confirmBooking, cancelBooking } = require('../controllers/bookingController');


router .post('/', protect, bookInvite);
router.post('/send-otp', protect, sendBookingOTP);
router.get('/my', protect, getMyBookings);
router.put('/:id/confirm', protect, admin, confirmBooking);
router.delete('/:id', protect,  cancelBooking);

module.exports = router;

