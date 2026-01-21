const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser); // Public
router.post('/login', loginUser);       // Public
router.get('/me', protect, getMe);      // Private

module.exports = router;
