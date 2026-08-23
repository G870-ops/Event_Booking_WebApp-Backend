
const Invite = require('../models/Invite');

exports.getAllInvites = async (req, res) => {
    try {

           const filters = {};
           if (req.query.category) {
               filters.category = req.query.category;
           }
           if (req.query.ticketPrice) {
               filters.ticketPrice = req.query.ticketPrice;
           }
          
           

        const invites = await Invite.find(filters);
        res.json(invites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getInviteById = async (req, res) => {
    try {
        const invite = await Invite.findById(req.params.id);
        if (!invite) {
            return res.status(404).json({ message: 'Invite not found' });
        }
        res.json(invite);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createInvite = async (req, res) => {
    const { title, description, date, location, category, totalSeats, ticketPrice, imageUrl, image } = req.body;
    try {
        const invite = await Invite.create({
            title,
            description,
            date,
            location,
            category,
            totalSeats,
            availableSeats: totalSeats,
            ticketPrice,
            imageUrl: image || imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
            createdBy: req.user._id
        });
        res.status(201).json(invite);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateInvite = async (req, res) => {
    const { title, description, date, location, category, totalSeats, ticketPrice, imageUrl, image } = req.body;
    try {
        const invite = await Invite.findByIdAndUpdate(req.params.id, {
            title,
            description,
            date,
            location,
            category,
            totalSeats,
            ticketPrice,
            imageUrl: image || imageUrl
        }, { new: true });
        if (!invite) {
            return res.status(404).json({ message: 'Invite not found' });
        }
        res.json(invite);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteInvite = async (req, res) => {
    try {
        const invite = await Invite.findByIdAndDelete(req.params.id);
        if (!invite) {
            return res.status(404).json({ message: 'Invite not found' });
        }
        res.json({ message: 'Invite deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 
