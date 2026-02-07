const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, getMe, inviteUser } = require('../controllers/authController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

router.post('/register', optionalProtect, registerUser); // Public or Private
router.post('/login', loginUser);       // Public
router.post('/logout', protect, logoutUser);  // Private
router.get('/me', protect, getMe);      // Private
router.post('/invite', protect, inviteUser); // Private (Super Admin only based on controller check)

module.exports = router;
