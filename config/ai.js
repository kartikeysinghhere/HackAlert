const Groq = require('groq-sdk');
const { GROQ_API_KEY } = require('./env');

const client = new Groq({ apiKey: GROQ_API_KEY });

module.exports = client;
