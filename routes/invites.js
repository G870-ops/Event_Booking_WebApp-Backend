const express = require('express');
const router = express.Router();
const {protect, admin} = require('../middleware/auth');

const { getAllInvites, getInviteById, createInvite, updateInvite, deleteInvite } = require('../controllers/inviteController');


//Get all invites
router.get('/',getAllInvites);

//Get invite by ID
router.get('/:id',getInviteById);

//Create invite (admin only)
router.post('/', protect, admin, createInvite);

//Update invite (admin only)
router.put('/:id', protect, admin, updateInvite);

//Delete invite (admin only)
router.delete('/:id', protect, admin, deleteInvite);

module.exports = router;