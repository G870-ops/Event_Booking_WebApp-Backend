// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const authRoutes = require('./routes/auth.js');
// const inviteRoutes = require('./routes/invites.js');
// const bookingRoutes = require('./routes/booking.js');


// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// //Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/invites', inviteRoutes);
// app.use('/api/bookings', bookingRoutes);




// //connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI)
// .then(async ()=>{
//     console.log('connected to MongoDB');
//     try {
//         await mongoose.connection.db.collection('users').dropIndex('email_1');
//         console.log('Old email_1 index dropped successfully.');
//     } catch (err) {
//         console.log('Note: could not drop old email index or it does not exist:', err.message);
//     }
// })
// .catch((error)=>{
//     console.error('Error connecting to MongoDB:', error);
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     // Corrected: Changed single quotes to backticks so ${PORT} evaluates dynamically
//     console.log(`backend is running on port ${PORT}`); 
// });







const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth.js');
const inviteRoutes = require('./routes/invites.js');
const bookingRoutes = require('./routes/booking.js');

// Load .env explicitly from backend directory and fallback to root
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serverless Mongoose Connection Caching
let isConnected = false;

const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }
    const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : null;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is not set in environment variables. Please configure MONGODB_URI in your deployment settings.');
    }
    try {
        const db = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging indefinitely
        });
        isConnected = db.connections[0].readyState === 1;
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        throw error;
    }
};

// Connect immediately on server start in local / persistent server mode
if (!process.env.VERCEL) {
    connectDB().catch(() => {});
}

// Middleware to ensure DB connection before handling API routes
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(500).json({
            error: 'Database connection failure. Check MongoDB Atlas connection string and IP whitelist.',
            details: error.message
        });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => {
    res.json({ message: "Event Booking API is running successfully" });
});

// Serve React static files and start server ONLY if not on Vercel
if (!process.env.VERCEL) {
    const frontendPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendPath));

    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });

    const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use by another process! Run "Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force" in PowerShell to free it.`);
        } else {
            console.error('❌ Server listen error:', err.message);
        }
    });
}

// Export app for Vercel Serverless Functions
module.exports = app;