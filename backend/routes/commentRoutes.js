const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Comment = require('../models/commentModel');
const Task = require('../models/taskModel');
const Project = require('../models/projectModel');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// @desc    Create comment on task or project
// @route   POST /api/comments
// @access  Private (project members only)
const createComment = asyncHandler(async (req, res) => {
    const { taskId, projectId, content } = req.body;

    if (!content || content.trim().length === 0) {
        res.status(400);
        throw new Error('Comment content is required');
    }

    // Must specify either taskId or projectId (not both)
    if ((taskId && projectId) || (!taskId && !projectId)) {
        res.status(400);
        throw new Error('Must specify either taskId or projectId');
    }

    // Verify access to task or project
    if (taskId) {
        const task = await Task.findById(taskId).populate('project');
        if (!task) {
            res.status(404);
            throw new Error('Task not found');
        }
        // TODO: Add project membership check
    }

    if (projectId) {
        const project = await Project.findById(projectId);
        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }
        // TODO: Add project membership check
    }

    const comment = await Comment.create({
        user: req.user.id,
        task: taskId || null,
        project: projectId || null,
        content: content.trim()
    });

    await comment.populate('user', 'name email');

    // Email Notification
    const { sendEmail } = require('../services/emailService');
    try {
        if (taskId) {
            const task = await Task.findById(taskId).populate('assignedTo');
            // Notify Assignee if not the commenter
            if (task.assignedTo && task.assignedTo._id.toString() !== req.user.id) {
                await sendEmail({
                    recipient: task.assignedTo.email,
                    recipientName: task.assignedTo.name,
                    subject: `New Comment on Task: ${task.title}`,
                    body: `User ${req.user.name} commented on task "${task.title}":\n\n"${content.trim()}"`,
                    type: 'notification',
                    metadata: { taskId, commentId: comment._id }
                });
            }
        }
        // Could also notify Project Owner if projectId
    } catch (err) {
        console.error('Email notification failed:', err.message);
    }

    res.status(201).json(comment);
});

// @desc    Get comments for a task
// @route   GET /api/comments/task/:taskId
// @access  Private (project members)
const getTaskComments = asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    const comments = await Comment.find({ task: taskId })
        .populate('user', 'name email')
        .sort({ createdAt: 1 }); // Oldest first for thread view

    res.json(comments);
});

// @desc    Get comments for a project
// @route   GET /api/comments/project/:projectId
// @access  Private (project members)
const getProjectComments = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    const comments = await Comment.find({ project: projectId })
        .populate('user', 'name email')
        .sort({ createdAt: 1 });

    res.json(comments);
});

// @desc    Update comment (owner only, within 15 minutes)
// @route   PUT /api/comments/:id
// @access  Private (owner only)
const updateComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
        res.status(404);
        throw new Error('Comment not found');
    }

    // Only owner can edit
    if (comment.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to edit this comment');
    }

    // Check 15-minute edit window
    const now = new Date();
    const commentAge = (now - comment.createdAt) / 1000 / 60; // minutes

    if (commentAge > 15) {
        res.status(400);
        throw new Error('Edit window has expired (15 minutes)');
    }

    if (!content || content.trim().length === 0) {
        res.status(400);
        throw new Error('Comment content is required');
    }

    comment.content = content.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();
    await comment.populate('user', 'name email');

    res.json(comment);
});

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private (owner or super_admin)
const deleteComment = asyncHandler(async (req, res) => {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
        res.status(404);
        throw new Error('Comment not found');
    }

    // Only owner or super admin can delete
    if (comment.user.toString() !== req.user.id && req.user.role !== 'super_admin') {
        res.status(403);
        throw new Error('Not authorized to delete this comment');
    }

    await comment.deleteOne();
    res.json({ id: req.params.id });
});

router.post('/', createComment);
router.get('/task/:taskId', getTaskComments);
router.get('/project/:projectId', getProjectComments);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

module.exports = router;
