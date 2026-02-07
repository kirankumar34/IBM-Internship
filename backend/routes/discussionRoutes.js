const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Discussion = require('../models/discussionModel');
const Project = require('../models/projectModel');
const Notification = require('../models/notificationModel');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Helper to parse @mentions from content
const parseMentions = (content) => {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    return matches ? matches.map(m => m.substring(1)) : [];
};

// @desc    Create discussion
// @route   POST /api/discussions
// @access  Private (project members)
const createDiscussion = asyncHandler(async (req, res) => {
    const { projectId, title, description } = req.body;

    if (!title || !description) {
        res.status(400);
        throw new Error('Title and description are required');
    }

    const project = await Project.findById(projectId);
    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    // Verify Role: Only PM/Admin/Owner can create discussions
    const isAuthorized = project.owner.toString() === req.user.id ||
        ['super_admin', 'project_admin', 'project_manager'].includes(req.user.role);

    if (!isAuthorized) {
        res.status(403);
        throw new Error('Only Project Managers and Admins can create discussions');
    }

    const discussion = await Discussion.create({
        project: projectId,
        createdBy: req.user.id,
        title,
        description
    });

    await discussion.populate('createdBy', 'name email');
    await discussion.populate('project', 'name');

    res.status(201).json(discussion);
});

// @desc    Get discussions for a project
// @route   GET /api/discussions/project/:projectId
// @access  Private (project members)
const getProjectDiscussions = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    const discussions = await Discussion.find({ project: projectId })
        .populate('createdBy', 'name email')
        .sort({ isPinned: -1, createdAt: -1 });

    res.json(discussions);
});

// @desc    Get single discussion
// @route   GET /api/discussions/:id
// @access  Private (project members)
const getDiscussion = asyncHandler(async (req, res) => {
    const discussion = await Discussion.findById(req.params.id)
        .populate('createdBy', 'name email')
        .populate('replies.user', 'name email')
        .populate('project', 'name');

    if (!discussion) {
        res.status(404);
        throw new Error('Discussion not found');
    }

    res.json(discussion);
});

// @desc    Add reply to discussion
// @route   POST /api/discussions/:id/replies
// @access  Private (project members)
const addReply = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const discussion = await Discussion.findById(req.params.id).populate('project');

    if (!discussion) {
        res.status(404);
        throw new Error('Discussion not found');
    }

    if (discussion.isClosed) {
        res.status(400);
        throw new Error('Cannot reply to a closed discussion');
    }

    if (!content || content.trim().length === 0) {
        res.status(400);
        throw new Error('Reply content is required');
    }

    discussion.replies.push({
        user: req.user.id,
        content: content.trim()
    });

    await discussion.save();
    await discussion.populate('replies.user', 'name email');

    // Notify discussion creator
    if (discussion.createdBy.toString() !== req.user.id) {
        await Notification.create({
            recipient: discussion.createdBy,
            sender: req.user.id,
            type: 'discussion_reply',
            title: 'New Reply',
            message: `${req.user.name} replied to your discussion "${discussion.title}"`,
            refModel: 'Discussion',
            refId: discussion._id
        });
    }

    res.status(201).json(discussion);
});

// @desc    Delete discussion (Admin/PM only)
// @route   DELETE /api/discussions/:id
// @access  Private (Admin/PM)
const deleteDiscussion = asyncHandler(async (req, res) => {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
        res.status(404);
        throw new Error('Discussion not found');
    }

    const isOwner = discussion.createdBy.toString() === req.user.id;
    const isAdmin = ['super_admin', 'project_admin', 'project_manager'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
        res.status(403);
        throw new Error('Not authorized to delete this discussion');
    }

    await discussion.deleteOne();
    res.json({ id: req.params.id });
});

// @desc    Toggle pin discussion
// @route   PUT /api/discussions/:id/pin
// @access  Private (Admin/PM)
const togglePinDiscussion = asyncHandler(async (req, res) => {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
        res.status(404);
        throw new Error('Discussion not found');
    }

    if (!['super_admin', 'project_admin', 'project_manager'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized to pin discussions');
    }

    discussion.isPinned = !discussion.isPinned;
    await discussion.save();

    res.json(discussion);
});

// @desc    Close/Reopen discussion
// @route   PUT /api/discussions/:id/close
// @access  Private (Admin/PM/Owner)
const toggleCloseDiscussion = asyncHandler(async (req, res) => {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
        res.status(404);
        throw new Error('Discussion not found');
    }

    const isOwner = discussion.createdBy.toString() === req.user.id;
    const isAdmin = ['super_admin', 'project_admin', 'project_manager'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
        res.status(403);
        throw new Error('Not authorized');
    }

    discussion.isClosed = !discussion.isClosed;
    await discussion.save();

    res.json(discussion);
});

router.post('/', createDiscussion);
router.get('/project/:projectId', getProjectDiscussions);
router.get('/:id', getDiscussion);
router.post('/:id/replies', addReply);
router.delete('/:id', deleteDiscussion);
router.put('/:id/pin', togglePinDiscussion);
router.put('/:id/close', toggleCloseDiscussion);

module.exports = router;
