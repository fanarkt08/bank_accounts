const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const methodNotAllowed = require('../utils/methodNotAllowed');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many attempts, please try again later.' },
});

router.use(authLimiter);

router.post('/register', authController.register);
router.all('/register', methodNotAllowed('POST'));

router.post('/login', authController.login);
router.all('/login', methodNotAllowed('POST'));

module.exports = router;
