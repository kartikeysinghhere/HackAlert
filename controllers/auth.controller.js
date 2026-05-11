const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

exports.signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);
  res.json(result);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(result);
});
