const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { signupSchema, loginSchema } = require('../schemas/auth.schema');
const { authLimiter } = require('../middleware/security');

router.post('/signup', authLimiter, validate(signupSchema), authController.signup);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

module.exports = router;
