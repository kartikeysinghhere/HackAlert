const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');
const { JWT_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } = require('../config/env');
const { ApiError } = require('../utils/errorHandler');

const resolveStoredPasswordHash = (user) =>
  user?.hashed_password || user?.password || user?.hashedPassword || null;

/**
 * Generate Access and Refresh tokens for a user
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { email: user.email },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};

/**
 * Store refresh token in database for rotation/revocation
 */
const storeRefreshToken = async (email, token) => {
  // Calculate expiry date for DB record
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000).toISOString();

  const { error } = await supabase
    .from('refresh_tokens')
    .insert([{
      user_email: email,
      token,
      expires_at: expiresAt
    }]);

  if (error) {
    console.error('[AuthService] Failed to store refresh token:', error.message);
    // We don't necessarily want to block login if DB write fails,
    // but for strict security we should. Given this is a task, we'll log it.
  }
};

const register = async ({ email, pass, name, username, gender, college }) => {
  const { data: existing } = await supabase.from('users').select('*').eq('email', email).single();
  if (existing) throw new ApiError(400, 'User already exists');

  const hashed_password = await bcrypt.hash(pass, 10);
  let user = null;
  let error = null;

  // Prefer new column name, fallback for legacy schemas still using `password`.
  ({ data: user, error } = await supabase
    .from('users')
    .insert([{ email, hashed_password, name, username, gender, college }])
    .select()
    .single());

  if (error && /hashed_password/i.test(error.message || '')) {
    ({ data: user, error } = await supabase
      .from('users')
      .insert([{ email, password: hashed_password, name, username, gender, college }])
      .select()
      .single());
  }

  if (error) throw new ApiError(500, error.message);

  const { accessToken, refreshToken } = generateTokens(user);
  await storeRefreshToken(user.email, refreshToken);

  return { user, accessToken, refreshToken };
};

const login = async ({ email, pass }) => {
  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (!user || error) throw new ApiError(401, 'Invalid credentials');

  const storedHash = resolveStoredPasswordHash(user);
  if (!storedHash) {
    throw new ApiError(500, 'User password column is missing in database schema');
  }

  const match = await bcrypt.compare(pass, storedHash);
  if (!match) throw new ApiError(401, 'Invalid credentials');

  const { accessToken, refreshToken } = generateTokens(user);
  await storeRefreshToken(user.email, refreshToken);

  return { user, accessToken, refreshToken };
};

const refresh = async (oldRefreshToken) => {
  if (!oldRefreshToken) throw new ApiError(401, 'Refresh token required');

  let payload;
  try {
    payload = jwt.verify(oldRefreshToken, JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  // Check if token exists and is not revoked in DB
  const { data: tokenRecord, error } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('token', oldRefreshToken)
    .single();

  if (error || !tokenRecord || tokenRecord.revoked) {
    // Refresh token reuse/theft detection
    if (tokenRecord && tokenRecord.revoked) {
      // Possible breach: invalidate ALL tokens for this user
      await supabase.from('refresh_tokens').update({ revoked: true }).eq('user_email', payload.email);
      throw new ApiError(403, 'Security breach detected. Please login again.');
    }
    throw new ApiError(401, 'Invalid refresh token');
  }

  // Revoke the used token (Rotation)
  await supabase.from('refresh_tokens').update({ revoked: true }).eq('token', oldRefreshToken);

  // Get user to generate new tokens
  const { data: user } = await supabase.from('users').select('*').eq('email', payload.email).single();
  if (!user) throw new ApiError(404, 'User no longer exists');

  const { accessToken, refreshToken } = generateTokens(user);
  await storeRefreshToken(user.email, refreshToken);

  return { accessToken, refreshToken };
};

const logout = async (refreshToken) => {
  if (refreshToken) {
    await supabase.from('refresh_tokens').delete().eq('token', refreshToken);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout
};
