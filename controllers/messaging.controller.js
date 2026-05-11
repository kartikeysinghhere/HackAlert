const messagingService = require('../services/messaging.service');
const sseService = require('../sockets/sse');
const asyncHandler = require('../utils/asyncHandler');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

exports.getConversations = asyncHandler(async (req, res) => {
  const result = await messagingService.getConversations(req.user.email);
  res.json(result);
});

exports.getMessages = asyncHandler(async (req, res) => {
  const result = await messagingService.getMessages(req.user.email, req.params.partner_email);
  res.json(result);
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const result = await messagingService.sendMessage(req.user.email, req.params.partner_email, req.body.message);
  res.json(result);
});

exports.markAsSeen = asyncHandler(async (req, res) => {
  const result = await messagingService.markAsSeen(req.user.email, req.params.partner_email);
  res.json(result);
});

exports.streamMessages = (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();

  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  const email = user.email;
  const partner = decodeURIComponent(req.params.partner_email);
  const dmKey = [email, partner].sort().join('::');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseService.addDMClient(dmKey, res);

  req.on('close', () => {
    sseService.removeDMClient(dmKey, res);
  });
};
