const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/email');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register user
exports.registerUser = async (req, res) => {
    const { name, email, mobile, password } = req.body;

    if (!email && !mobile) {
        return res.status(400).send({ error: 'Either Email ID or Mobile Number is required' });
    }

    try {
        const orConditions = [];
        if (email) orConditions.push({ email });
        if (mobile) orConditions.push({ mobile });

        let userExists = await User.findOne({ $or: orConditions });
        if (userExists) {
            return res.status(400).send({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const role = req.body.role || 'user';
        const user = await User.create({ name, email, mobile, password: hashedPassword, role, isVerified: false });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const primaryIdentifier = email || mobile;

        console.log(`OTP for ${primaryIdentifier}: ${otp}`);
        await OTP.create({ email: primaryIdentifier, otp, action: 'account_verification' });

        if (email) {
            await sendOTPEmail(email, otp, 'account_verification');
        }
        if (mobile) {
            const { sendOTPSMS } = require('../utils/sms');
            await sendOTPSMS(mobile, otp);
        }

        res.status(201).json({
             message: email 
                ? 'User registered successfully. Please check your email for OTP to verify your account.' 
                : 'User registered successfully. Please use OTP to verify your account.',
             email: primaryIdentifier
        });
        
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
};


//login user
exports.loginUser = async (req, res) => {
    const { email, password } = req.body; // email could be email or mobile

    try {
        let user = await User.findOne({ $or: [{ email }, { mobile: email }] });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials. Please Sign Up first.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const primaryIdentifier = user.email || user.mobile;

        if (!user.isVerified && user.role === 'user') {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`🔑 Verification OTP for ${primaryIdentifier}: ${otp}`);
            await OTP.create({ email: primaryIdentifier, otp, action: 'account_verification' });
            if (user.email) {
                await sendOTPEmail(user.email, otp, 'account_verification');
            }
            if (user.mobile) {
                const { sendOTPSMS } = require('../utils/sms');
                await sendOTPSMS(user.mobile, otp);
            }
            return res.status(400).json({ 
                error: user.email 
                    ? 'Account not verified. A new OTP has been sent to your email.' 
                    : 'Account not verified. A new OTP has been generated for your mobile.' 
            });
        }

        res.json({ 
            message: 'Login successful', 
            _id: user._id, 
            name: user.name, 
            email: user.email || user.mobile, 
            role: user.role, 
            token: generateToken(user._id, user.role) 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//verify OTP
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body; // email acts as the primary identifier (email or mobile)
    const otpRecord = await OTP.findOne({ email, otp, action: 'account_verification' });

    if (!otpRecord) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    const user = await User.findOneAndUpdate(
        { $or: [{ email }, { mobile: email }] }, 
        { isVerified: true },
        { new: true }
    );

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    await OTP.deleteMany({ email, action: 'account_verification' }); // Remove used OTPs for security

    res.json({
        message: 'Account verified successfully. You can now log in.',
        _id: user._id,
        name: user.name,
        email: user.email || user.mobile,
        role: user.role,
        token: generateToken(user._id, user.role)
    });
};