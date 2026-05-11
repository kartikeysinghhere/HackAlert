const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { ApiError } = require('../utils/errorHandler');

/**
 * Authentication Middleware
 * Checks for access token in cookies or Authorization header
 */
const authenticate = (req, res, next) => {
  let token = req.cookies?.accessToken;

  // Fallback to Authorization header for transition/compatibility
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { email, username }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expired'));
    }
    return next(new ApiError(401, 'Invalid token'));
  }
};

module.exports = {
  authenticate
};
