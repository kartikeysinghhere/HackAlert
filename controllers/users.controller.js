const usersService = require('../services/users.service');
const asyncHandler = require('../utils/asyncHandler');

const getProfile = asyncHandler(async (req, res) => {
  const email = req.params.email ? decodeURIComponent(req.params.email) : req.user.email;
  const result = await usersService.getProfile(email);
  res.json(result);
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await usersService.updateProfile(req.user.email, req.body);
  res.json(result);
});

const getFriends = asyncHandler(async (req, res) => {
  const result = await usersService.getFriends(req.user.email);
  res.json(result);
});

const removeFriend = asyncHandler(async (req, res) => {
  const result = await usersService.removeFriend(req.user.email, decodeURIComponent(req.params.friend_email));
  res.json(result);
});

const ping = asyncHandler(async (req, res) => {
  const result = await usersService.ping(req.user.email);
  res.json(result);
});

const getOnline = asyncHandler(async (req, res) => {
  const result = await usersService.getOnline();
  res.json(result);
});

module.exports = {
  getProfile,
  updateProfile,
  getFriends,
  removeFriend,
  ping,
  getOnline
};
