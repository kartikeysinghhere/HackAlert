const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  host: env.BREVO_SMTP_HOST,
  port: parseInt(env.BREVO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: env.BREVO_SMTP_USER,
    pass: env.BREVO_SMTP_PASS
  }
});

module.exports = transporter;