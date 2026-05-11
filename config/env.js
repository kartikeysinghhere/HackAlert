require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY || 're_dummy',
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOWED_ORIGIN: process.env.NODE_ENV === 'production'
    ? 'https://hackalert-xwpd.onrender.com'
    : 'http://localhost:3000'
};
