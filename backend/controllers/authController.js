const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const LoginActivity = require('../models/loginActivityModel');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const crypto = require('crypto');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const currentUser = req.user; // If logged in, this will be populated

    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    // Check if user exists (email or loginId)
    // For web registration, we treat email as loginId initially
    const userExists = await User.findOne({
        $or: [{ email }, { loginId: email }]
    });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const Organization = require('../models/organizationModel');

    // Logic for Organization:
    // 1. If invited by Admin (currentUser exists), add to their Organization.
    // 2. If public signup, create a NEW Organization for them.
    let organizationId = null;
    let intendedRole = role || 'client';
    let approvalStatus = 'approved';
    let requestedRole = null;

    if (currentUser && currentUser.organizationId) {
        // Invited by Admin
        organizationId = currentUser.organizationId;

        if (['team_member', 'team_leader', 'project_manager'].includes(intendedRole)) {
            if (currentUser.role !== 'super_admin') {
                approvalStatus = 'pending';
                requestedRole = intendedRole;
            }
        }
    } else {
        // Public Signup -> Create New Organization
        const orgName = `${name}'s Organization`;
        const newOrg = await Organization.create({
            name: orgName,
            status: 'active'
        });
        organizationId = newOrg._id;

        // Upgrade first user to Super Admin of their own org
        intendedRole = 'super_admin';

        // Update Org with creator
        newOrg.createdBy = user ? user._id : null; // We don't have user yet, will update later? 
        // Actually, let's create user first then update org or just leave createdBy until later
        // But we need orgId for user creation
    }

    const user = await User.create({
        name,
        email,
        loginId: email,
        password,
        role: intendedRole,
        requestedRole,
        approvalStatus,
        organizationId,
        passwordHistory: []
    });

    if (!currentUser && organizationId) {
        await Organization.findByIdAndUpdate(organizationId, { createdBy: user._id });
    }

    if (user) {
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            approvalStatus: user.approvalStatus,
            token: (approvalStatus === 'approved' && !currentUser) ? generateToken(user._id) : null,
            message: approvalStatus === 'pending' ? 'Account created. Waiting for approval.' : 'Registration successful'
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { loginId, password } = req.body;

    console.log(`[LOGIN ATTEMPT] loginId: ${loginId}`);

    if (!loginId || !password) {
        res.status(400);
        throw new Error('Please provide Login ID and Password');
    }

    // Check for user by email OR loginId
    const user = await User.findOne({
        $or: [{ email: loginId }, { loginId: loginId }]
    }).populate('teamId', 'name');

    if (!user) {
        console.log('[LOGIN FAILED] User not found');
        res.status(400);
        throw new Error('Invalid credentials');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        console.log('[LOGIN FAILED] Password mismatch');
        res.status(400);
        throw new Error('Invalid credentials');
    }

    // Check Approval Status
    if (user.approvalStatus !== 'approved') {
        console.log(`[LOGIN FAILED] User pending approval. Status: ${user.approvalStatus}`);
        res.status(403);
        throw new Error('Your account is pending approval');
    }

    console.log(`[LOGIN SUCCESS] User: ${user.name} (${user.role})`);

    // Track login activity
    await LoginActivity.create({
        user: user._id,
        loginTime: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    // Audit Log
    const Activity = require('../models/activityModel');
    await Activity.create({
        user: user._id,
        action: 'User Login',
        details: `${user.name} logged in from ${req.ip || 'unknown IP'}`
    });

    res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        loginId: user.loginId,
        teamId: user.teamId,
        organizationId: user.organizationId,
        token: generateToken(user._id),
    });
});

// @desc    Forgot Password - Generate Token
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { loginId } = req.body;

    const user = await User.findOne({
        $or: [{ email: loginId }, { loginId: loginId }]
    });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');
    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // In a real app, send email here. For this demo, return the token so user can use it.
    res.status(200).json({
        success: true,
        data: resetToken,
        message: 'Reset token generated (simulated email)'
    });
});

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired token');
    }

    const { password } = req.body;

    // Check overlap with last 3 passwords
    for (let oldHash of user.passwordHistory) {
        const isMatch = await bcrypt.compare(password, oldHash);
        if (isMatch) {
            res.status(400);
            throw new Error('Cannot reuse any of the last 3 passwords');
        }
    }

    // Save current password to history before changing
    // We need to fetch the current hash from DB (which is user.password)
    // user.password is already hashed
    user.passwordHistory.unshift(user.password);
    if (user.passwordHistory.length > 3) {
        user.passwordHistory.pop(); // Keep only 3
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
        success: true,
        data: 'Password updated successfully'
    });
});

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate('reportsTo', 'name email role').select('-password');
    res.json(user);
});

// @desc    Logout user and track activity
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
    // Find the most recent active session for this user
    const latestSession = await LoginActivity.findOne({
        user: req.user.id,
        logoutTime: null
    }).sort({ loginTime: -1 });

    if (latestSession) {
        await latestSession.logout(); // Use the model method
    }

    // Audit Log
    const Activity = require('../models/activityModel');
    await Activity.create({
        user: req.user.id,
        action: 'User Logout',
        details: `${req.user.name} logged out`
    });

    res.json({ message: 'Logged out successfully' });
});

// @desc    Invite user to organization
// @route   POST /api/auth/invite
// @access  Private (Super Admin)
const inviteUser = asyncHandler(async (req, res) => {
    const { email, role } = req.body;

    if (req.user.role !== 'super_admin') {
        res.status(403);
        throw new Error('Only Super Admins can invite users');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Simulate Email
    const { sendEmail } = require('../services/emailService');
    const inviterName = req.user.name;
    const orgName = 'Your Organization'; // In real app, fetch org name

    await sendEmail({
        recipient: email,
        recipientName: 'Invited User',
        subject: `Invitation to join ${orgName}`,
        body: `Hello,\n\nYou have been invited by ${inviterName} to join ${orgName} as a ${role}.\n\nPlease register using this email to join.\n\nBest regards,\nProject Management System`,
        type: 'system',
        metadata: { invitedBy: req.user.id, role }
    });

    res.json({ message: `Invitation sent to ${email}` });
});

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getMe,
    forgotPassword,
    resetPassword,
    inviteUser
};
