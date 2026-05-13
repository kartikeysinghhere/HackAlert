const messagingService = require('../services/messaging.service');
const realtimeService = require('../services/realtime.service');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');

const getConversations = asyncHandler(async (req, res) => {
  const result = await messagingService.getConversations(req.user.email);
  res.json(result);
});

const getMessages = asyncHandler(async (req, res) => {
  const result = await messagingService.getMessages(req.user.email, decodeURIComponent(req.params.partner_email));
  res.json(result);
});

const sendMessage = asyncHandler(async (req, res) => {
  const result = await messagingService.sendMessage(req.user.email, decodeURIComponent(req.params.partner_email), req.body.message);
  res.json(result);
});

const markSeen = asyncHandler(async (req, res) => {
  const result = await messagingService.markSeen(req.user.email, decodeURIComponent(req.params.partner_email));
  res.json(result);
});

const streamMessages = (req, res) => {
  const email = req.user.email;
  const partner = decodeURIComponent(req.params.partner_email);
  const dmKey = [email, partner].sort().join('::');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  realtimeService.addClient(dmKey, res);

  req.on('close', () => {
    realtimeService.removeClient(dmKey, res);
  });
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markSeen,
  streamMessages
};
