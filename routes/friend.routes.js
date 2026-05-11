const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');

router.post('/request', authenticate, userController.sendFriendRequest);
router.get('/requests', authenticate, userController.getFriendRequests);
router.put('/requests/:id', authenticate, userController.respondToFriendRequest);
router.get('/', authenticate, userController.getFriends);
router.delete('/:friend_email', authenticate, userController.removeFriend);

module.exports = router;
