const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

// @desc    Get all users (hierarchical view)
// @route   GET /api/users
// @access  Private
const getUsers = asyncHandler(async (req, res) => {
    const { role, id } = req.user;

    let query = {};

    // Strict Hierarchy Filtering
    if (role === 'project_manager') {
        query = { role: { $in: ['team_leader', 'team_member'] } };
    } else if (role === 'team_leader') {
        query = { role: { $in: ['team_member'] } };
    } else if (role === 'client') {
        query = { role: 'client' }; // Clients see other clients? Or nothing. Let's say nothing for now.
    } else if (role === 'team_member') {
        query = { _id: id };
    }

    const users = await User.find(query)
        .populate('reportsTo', 'name email role')
        .select('-password')
        .sort({ role: 1, name: 1 });

    res.json(users);
});

// @desc    Create new user member (Hierarchy restricted)
// @route   POST /api/users
// @access  Private (Admin/PM/TL only)
const createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const currentUserRole = req.user.role;

    // Strict Mapping matching Prompt
    const allowedRoles = {
        'super_admin': ['project_manager'],
        'project_manager': ['team_leader'],
        'team_leader': ['team_member']
    };

    if (!allowedRoles[currentUserRole] || !allowedRoles[currentUserRole].includes(role)) {
        res.status(403);
        throw new Error(`As a ${currentUserRole}, you cannot create a ${role}`);
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
        role,
        reportsTo: req.user.id,
        organizationId: req.user.organizationId
    });

    res.status(201).json(user);
});

// @desc    Update user
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }

    if (req.user.id !== user._id.toString() && req.user.role !== 'super_admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.password) user.password = req.body.password;

    const updatedUser = await user.save();
    res.json(updatedUser);
});

// @desc    Delete user
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }

    if (req.user.role !== 'super_admin') {
        res.status(403);
        throw new Error('Only Super Admin can remove users');
    }

    await user.deleteOne();
    res.json({ message: 'User removed' });
});

// @desc    Approve a user (Hierarchy enforced)
// @route   PUT /api/users/:id/approve
// @access  Private
const approveUser = asyncHandler(async (req, res) => {
    const userToApprove = await User.findById(req.params.id);
    if (!userToApprove) {
        res.status(404);
        throw new Error('User not found');
    }

    const { role: approverRole } = req.user;
    const { requestedRole } = userToApprove; // Or use role if it was set directly

    // Approval Hierarchy
    const approvalMap = {
        'team_member': 'team_leader', // Team Member approved by Team Leader
        'team_leader': 'project_manager', // Team Leader approved by PM
        'project_manager': 'super_admin' // PM approved by Super Admin
    };

    const requiredApprover = approvalMap[requestedRole || userToApprove.role];

    // Allow Super Admin to approve anyone (optional, but good for testing)
    const isSuperAdmin = approverRole === 'super_admin';

    if (approverRole !== requiredApprover && !isSuperAdmin) {
        res.status(403);
        throw new Error(`You cannot approve a ${requestedRole || userToApprove.role}. Required: ${requiredApprover}`);
    }

    userToApprove.approvalStatus = 'approved';
    userToApprove.role = requestedRole || userToApprove.role; // Confirm role
    if (req.body.action === 'reject') {
        userToApprove.approvalStatus = 'rejected';
        // Maybe delete user or keep as rejected? Requirement says "On rejection: User blocked with message"
        // So keeping them as rejected is fine.
    } else {
        // Assign reportsTo automatically based on approver?
        // "Approved By Team Leader" -> implies reporting?
        userToApprove.reportsTo = req.user.id;
    }

    const updatedUser = await userToApprove.save();
    res.json(updatedUser);
});

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    approveUser
};
