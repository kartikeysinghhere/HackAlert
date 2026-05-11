const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { NODE_ENV } = require('../config/env');

// Cookie configuration
const cookieOptions = {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'Strict',
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

module.exports = {
  register,
  login,
  refresh,
  logout
};
