const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');

exports.searchUsers = asyncHandler(async (req, res) => {
  const result = await userService.searchUsers(req.query.q);
  res.json(result);
});

exports.sendFriendRequest = asyncHandler(async (req, res) => {
  const result = await userService.sendFriendRequest(req.user.email, req.body.to_email);
  res.json(result);
});

exports.getFriendRequests = asyncHandler(async (req, res) => {
  const result = await userService.getFriendRequests(req.user.email);
  res.json(result);
});

exports.respondToFriendRequest = asyncHandler(async (req, res) => {
  const result = await userService.respondToFriendRequest(req.params.id, req.body.status, req.user.email);
  res.json(result);
});

exports.getFriends = asyncHandler(async (req, res) => {
  const result = await userService.getFriends(req.user.email);
  res.json(result);
});

exports.removeFriend = asyncHandler(async (req, res) => {
  const result = await userService.removeFriend(req.user.email, req.params.friend_email);
  res.json(result);
});

exports.ping = asyncHandler(async (req, res) => {
  const result = await userService.ping(req.user.email);
  res.json(result);
});

exports.getOnlineUsers = asyncHandler(async (req, res) => {
  const result = await userService.getOnlineUsers();
  res.json(result);
});
