const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { signupSchema, loginSchema } = require('../schemas/auth.schema');
const { authenticate } = require('../middleware/security');

// Public routes
router.post('/register', validate(signupSchema), authController.register);
router.post('/signup', validate(signupSchema), authController.register); // Backward-compatible alias
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);

// Protected routes
router.post('/logout', authController.logout);

module.exports = router;
