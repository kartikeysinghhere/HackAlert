const express = require('express');
const router = express.Router();
const messagingController = require('../controllers/messaging.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { dmSchema } = require('../schemas/team.schema');
const profanity = require('../validators/profanity.validator');

router.get('/conversations', authenticate, messagingController.getConversations);
router.get('/:partner_email', authenticate, messagingController.getMessages);
router.post('/:partner_email', authenticate, validate(dmSchema), profanity.middleware, messagingController.sendMessage);
router.put('/:partner_email/seen', authenticate, messagingController.markAsSeen);
router.get('/:partner_email/stream', messagingController.streamMessages);

module.exports = router;
