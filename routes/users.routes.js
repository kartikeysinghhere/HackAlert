const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const authenticate = require('../middleware/security').authenticate;
const validate = require('../middleware/validate');
const { profileSchema } = require('../schemas/profile.schema');

router.use(authenticate);

// Profile
router.get('/profile', usersController.getProfile);
router.get('/profile/:email', usersController.getProfile);
router.put('/profile', validate(profileSchema), usersController.updateProfile);

// Friends
router.get('/friends', usersController.getFriends);
router.delete('/friends/:friend_email', usersController.removeFriend);

// Online status
router.get('/users/online', usersController.getOnline);
router.post('/ping', usersController.ping);

module.exports = router;
