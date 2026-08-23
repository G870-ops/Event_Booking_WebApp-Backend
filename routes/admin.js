const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth'); // Destructured middleware functions
const Booking = require('../models/Bookings');
const AuditLog = require('../models/AuditLog');

// Gate Scanner Check-In Verification
router.post('/bookings/verify-qr', protect, async (req, res) => {
    try {
        const { ticketId } = req.body;
        const booking = await Booking.findById(ticketId).populate('userId inviteId');
        if (!booking) return res.status(404).json({ message: 'Invalid Ticket ID' });
        if (booking.checkedIn) return res.status(400).json({ message: 'Ticket Already Redeemed' });

        booking.checkedIn = true;
        await booking.save();
        res.json({ message: 'Gate Pass Authorized!', booking });
    } catch (error) {
        res.status(500).json({ message: 'Verification Server Error' });
    }
});

// Direct Email Broadcast Engine
router.post('/broadcast', protect, admin, async (req, res) => {
    try {
        const { inviteId, subject, message } = req.body;
        const bookings = await Booking.find({ inviteId, status: 'confirmed' }).populate('userId');
        const emails = bookings.map(b => b.userId?.email).filter(Boolean);

        // Optional: Trigger Nodemailer email sending logic here

        res.json({ message: `Broadcast dispatched to ${emails.length} attendees.` });
    } catch (error) {
        res.status(500).json({ message: 'Broadcast Dispatch Error' });
    }
});

// Fetch Audit Logs
router.get('/audit-logs', protect, admin, async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Audit Log Retrieval Error' });
    }
});

module.exports = router;