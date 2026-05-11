const express = require('express');
const router = express.Router();
const messagingController = require('../controllers/messaging.controller');
const authenticate = require('../middleware/security').authenticate;
const validate = require('../middleware/validate');
const profanity = require('../validators/profanity.validator');
const { dmSchema } = require('../schemas/team.schema');

router.get('/conversations', authenticate, messagingController.getConversations);
router.get('/:partner_email', authenticate, messagingController.getMessages);
router.post('/:partner_email', authenticate, validate(dmSchema), profanity.middleware, messagingController.sendMessage);
router.put('/:partner_email/seen', authenticate, messagingController.markSeen);
router.get('/:partner_email/stream', messagingController.streamMessages);

module.exports = router;
