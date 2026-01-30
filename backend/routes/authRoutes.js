const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, getMe } = require('../controllers/authController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

router.post('/register', optionalProtect, registerUser); // Public or Private
router.post('/login', loginUser);       // Public
router.post('/logout', protect, logoutUser);  // Private
router.get('/me', protect, getMe);      // Private

module.exports = router;
