const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');

// Frontend uses /api/register and /api/login directly
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

module.exports = router;
