const { Groq } = require('groq-sdk');
const env = require('./env');

if (!env.GROQ_API_KEY) {
  console.warn('Missing GROQ_API_KEY. AI features will fail.');
}

const client = new Groq({
  apiKey: env.GROQ_API_KEY
});

module.exports = client;
