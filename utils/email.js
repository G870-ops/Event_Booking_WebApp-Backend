const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

const sendbookingEmail = async (userEmail, userName, inviteTitle) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            // FIXED: Changed single quotes to backticks for template literal
            subject: `Booking Confirmed: ${inviteTitle}`, 
            // FIXED: Changed single quotes to backticks and properly enclosed HTML text
            html: `
                <h2>Hello ${userName},</h2>
                <p>Your booking for the invite <strong>${inviteTitle}</strong> is successfully confirmed. We look forward to seeing you there!</p>
                <p>Thank you for choosing Invitor!</p>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to', userEmail);
    } catch (error) {
        console.error('Error sending email : ', error);
    }
};

const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const title = type === 'account_verification' ? 'Verify your Invitor Account' : 'Invitor Booking verification';
        const msg = type === 'account_verification' ? 'Please use the following OTP to verify your new Invitor account:' : 'Please use the following OTP to verify and confirm your booking invitation:';

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: title,
            html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                <h2 style="color: #111;">${title}</h2>
                <p style="color: #555; font-size: 16px;">${msg}</p>
                <div style="margin: 20px auto; padding: 15px; font-size: 24px; font-weight: bold; background: #f4f4f4; width: max-content; letter-spacing: 5px;">
                ${otp}
                </div>
                <p style="color: #999; font-size: 12px;">This OTP will expire in 5 minutes. If you did not request this, please ignore this email.</p>
            </div>
            `
        };
        await transporter.sendMail(mailOptions);
        // FIXED: Changed single quotes to backticks so template string evaluates correctly
        console.log(`OTP sent to ${userEmail} for ${type}`); 
    } catch (error) {
        console.error('Error sending OTP email : ', error);
    }
};

// FIXED: Cleaned up export mismatch to ensure both functions export reliably
module.exports = {
    sendbookingEmail,
    sendOTPEmail
};