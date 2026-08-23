const https = require('https');

const postRequest = (url, headers, bodyString) => {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            method: 'POST',
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            headers: headers
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({ status: res.statusCode, data });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(bodyString);
        req.end();
    });
};

const sendOTPSMS = async (mobile, otp) => {
    const cleanMobile = mobile.replace(/\D/g, '').trim();

    // Standardize Indian numbers to start with +91 or use pure 10 digits as required
    let formattedMobile = cleanMobile;
    if (formattedMobile.length === 10) {
        formattedMobile = '+91' + formattedMobile;
    } else if (formattedMobile.length === 12 && formattedMobile.startsWith('91')) {
        formattedMobile = '+' + formattedMobile;
    }

    // 1. Try Fast2SMS Bulk SMS Service if configured
    if (process.env.FAST2SMS_API_KEY) {
        try {
            console.log(`[SMS] Sending SMS via Fast2SMS to ${cleanMobile}...`);
            const body = JSON.stringify({
                variables_values: otp,
                route: 'otp',
                numbers: cleanMobile
            });

            const result = await postRequest('https://www.fast2sms.com/dev/bulkV2', {
                'authorization': process.env.FAST2SMS_API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }, body);

            console.log(`[SMS] Fast2SMS status: ${result.status}, response: ${result.data}`);
            return JSON.parse(result.data);
        } catch (error) {
            console.error('[SMS] Error sending SMS via Fast2SMS:', error.message);
        }
    }

    // 2. Try Twilio SMS Service if configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
            console.log(`[SMS] Sending SMS via Twilio to ${formattedMobile}...`);
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

            const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
            
            const params = new URLSearchParams();
            params.append('To', formattedMobile);
            params.append('From', twilioNumber);
            params.append('Body', `Your Invitor security verification OTP is: ${otp}. Valid for 5 minutes.`);
            const bodyString = params.toString();

            const result = await postRequest(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(bodyString)
            }, bodyString);

            console.log(`[SMS] Twilio status: ${result.status}, response: ${result.data}`);
            return JSON.parse(result.data);
        } catch (error) {
            console.error('[SMS] Error sending SMS via Twilio:', error.message);
        }
    }

    console.log(`[SMS] ⚠️ No SMS keys configured (FAST2SMS_API_KEY or Twilio credentials missing in .env).`);
    console.log(`[SMS] 🔑 Printed OTP for testing: ${otp}`);
};

module.exports = { sendOTPSMS };
