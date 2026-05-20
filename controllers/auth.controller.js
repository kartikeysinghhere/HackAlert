const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { NODE_ENV } = require('../config/env');
const { ApiError } = require('../utils/errorHandler');

const isProduction = NODE_ENV === 'production';
const cookieSameSiteEnv = (process.env.COOKIE_SAME_SITE || '').toLowerCase();
const cookieSameSite = ['lax', 'strict', 'none'].includes(cookieSameSiteEnv)
  ? cookieSameSiteEnv
  : (isProduction ? 'none' : 'lax');

// Cookie configuration
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: cookieSameSite,
  path: '/'
};

const accessTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000 // 15 minutes
};

const refreshTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);

  res.cookie('accessToken', accessToken, accessTokenCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

  // Return user and token for frontend compatibility (transition period)
  res.status(201).json({ user, token: accessToken });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  res.cookie('accessToken', accessToken, accessTokenCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

  res.json({ user, token: accessToken });
});

const refresh = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken;
  const { accessToken, refreshToken } = await authService.refresh(oldRefreshToken);

  res.cookie('accessToken', accessToken, accessTokenCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

  res.json({ token: accessToken });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  await authService.logout(refreshToken);

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.json({ message: 'Logged out successfully' });
});

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email required');
  const result = await authService.sendOTP(email);
  res.json(result);
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, 'Email and OTP required');
  const result = await authService.verifyOTP(email, otp);
  res.json(result);
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  sendOTP,
  verifyOTP
};
