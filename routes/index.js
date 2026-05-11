const express = require('express');
const router = express.Router();

const hackathonRoutes = require('./hackathon.routes');
const aiRoutes = require('./ai.routes');
const teamRoutes = require('./team.routes');
const userRoutes = require('./user.routes');
const friendRoutes = require('./friend.routes');
const messagingRoutes = require('./messaging.routes');
const reviewRoutes = require('./review.routes');
const projectRoutes = require('./project.routes');
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');
const { validate } = require('../middleware/validate');
const { signupSchema, loginSchema } = require('../schemas/auth.schema');
const { authLimiter } = require('../middleware/security');
const { authenticate } = require('../middleware/auth');

// Auth routes
router.post('/signup', authLimiter, validate(signupSchema), authController.signup);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Hackathons & Saved
router.use('/', hackathonRoutes);

// AI
router.use('/ai', aiRoutes);

// Teams
router.use('/teams', teamRoutes);

// Users
router.use('/users', userRoutes);

// Friends
router.use('/friends', friendRoutes);

// Messaging
router.use('/dm', messagingRoutes);

// Reviews
router.use('/reviews', reviewRoutes);

// Projects
router.use('/projects', projectRoutes);

// Misc
router.post('/ping', authenticate, userController.ping);

module.exports = router;
