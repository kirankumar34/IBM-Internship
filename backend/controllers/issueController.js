const asyncHandler = require('express-async-handler');
const Issue = require('../models/issueModel');
const Notification = require('../models/notificationModel');

// @desc    Get issues by project
// @route   GET /api/issues/project/:projectId
// @access  Private
const getProjectIssues = asyncHandler(async (req, res) => {
    const issues = await Issue.find({ project: req.params.projectId })
        .populate('reportedBy', 'name')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 });
    res.json(issues);
});

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private
const createIssue = asyncHandler(async (req, res) => {
    const { title, description, project, severity, assignedTo } = req.body;

    const issue = await Issue.create({
        title,
        description,
        project,
        severity,
        assignedTo,
        reportedBy: req.user.id
    });

    await issue.populate('reportedBy', 'name');
    await issue.populate('assignedTo', 'name');

    // Notify Project Manager / Admin ? (Assuming logic handled elsewhere or next step)
    // Notify Assignee if exists
    if (assignedTo && assignedTo !== req.user.id) {
        await Notification.create({
            recipient: assignedTo,
            sender: req.user.id,
            type: 'task_assigned', // Reusing type or add 'issue_assigned'
            title: 'New Issue Assigned',
            message: `You have been assigned to issue: "${title}"`,
            refModel: 'Issue',
            refId: issue._id
        });
    }

    res.status(201).json(issue);
});

// @desc    Update issue (Status, Assignment, etc.)
// @route   PUT /api/issues/:id
// @access  Private
const updateIssue = asyncHandler(async (req, res) => {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
        res.status(404);
        throw new Error('Issue not found');
    }

    const { status, assignedTo, severity, description } = req.body;
    const oldAssignee = issue.assignedTo?.toString();

    // Update fields if provided
    if (status) issue.status = status;
    if (severity) issue.severity = severity;
    if (description) issue.description = description;
    if (assignedTo !== undefined) issue.assignedTo = assignedTo || null;

    const updatedIssue = await issue.save();
    await updatedIssue.populate('reportedBy', 'name');
    await updatedIssue.populate('assignedTo', 'name');

    // Notify new assignee
    if (assignedTo && assignedTo !== oldAssignee && assignedTo !== req.user.id) {
        await Notification.create({
            recipient: assignedTo,
            sender: req.user.id,
            type: 'task_assigned',
            title: 'Issue Expectation',
            message: `You have been assigned to issue: "${issue.title}"`,
            refModel: 'Issue',
            refId: issue._id
        });
    }

    // Notify reporter on resolution
    if (status === 'Resolved' && issue.reportedBy.toString() !== req.user.id) {
        await Notification.create({
            recipient: issue.reportedBy,
            sender: req.user.id,
            type: 'task_updated',
            title: 'Issue Resolved',
            message: `Issue "${issue.title}" has been resolved`,
            refModel: 'Issue',
            refId: issue._id
        });
    }

    res.json(updatedIssue);
});

// @desc    Delete issue
// @route   DELETE /api/issues/:id
// @access  Private (Admin/PM/Reporter)
const deleteIssue = asyncHandler(async (req, res) => {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
        res.status(404);
        throw new Error('Issue not found');
    }

    // Authorization check (Reporter or Admin/PM)
    if (issue.reportedBy.toString() !== req.user.id &&
        !['super_admin', 'project_manager'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized to delete this issue');
    }

    await issue.deleteOne();
    res.json({ message: 'Issue removed' });
});

module.exports = {
    getProjectIssues,
    createIssue,
    updateIssue,
    deleteIssue
};
