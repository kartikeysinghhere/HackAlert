require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
let PUBLIC_APP_URL = process.env.PUBLIC_APP_URL;

if (NODE_ENV === 'production' && !PUBLIC_APP_URL) {
  console.error('[Config Error] PUBLIC_APP_URL environment variable is required in production.');
  process.exit(1);
}

if (!PUBLIC_APP_URL) {
  PUBLIC_APP_URL = 'https://localhost:3000';
}

let parsedUrl;
try {
  parsedUrl = new URL(PUBLIC_APP_URL);
} catch (err) {
  console.error(`[Config Error] PUBLIC_APP_URL is not a valid URL: "${PUBLIC_APP_URL}"`);
  process.exit(1);
}

if (parsedUrl.protocol !== 'https:') {
  console.error(`[Config Error] PUBLIC_APP_URL must use HTTPS protocol: "${PUBLIC_APP_URL}"`);
  process.exit(1);
}

console.log('[Security] PUBLIC_APP_URL validated successfully.');

module.exports = {
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NODE_ENV,
  PUBLIC_APP_URL
};
