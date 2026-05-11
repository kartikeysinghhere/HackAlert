const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');

router.get('/search', authenticate, userController.searchUsers);
router.get('/online', authenticate, userController.getOnlineUsers);

module.exports = router;
