const { Resend } = require('resend');
const env = require('./env');

let resend = null;
if (env.RESEND_API_KEY) {
  resend = new Resend(env.RESEND_API_KEY);
} else {
  console.warn('Missing RESEND_API_KEY. Email features will fail.');
}

module.exports = resend;
