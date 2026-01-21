const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

// @desc    Get all users (in same org)
// @route   GET /api/users
// @access  Private
const getUsers = asyncHandler(async (req, res) => {
    // In a real multi-tenant app, we would filter by req.user.organization
    // For this demo, we verify the user is logged in and return all users
    const users = await User.find({}).select('-password');
    res.json(users);
});

module.exports = {
    getUsers
};
