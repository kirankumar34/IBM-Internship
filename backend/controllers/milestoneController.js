const asyncHandler = require('express-async-handler');
const Milestone = require('../models/milestoneModel');
const Project = require('../models/projectModel');
const Activity = require('../models/activityModel');

// @desc    Get milestones for a project
// @route   GET /api/projects/:projectId/milestones
const getMilestones = asyncHandler(async (req, res) => {
    const milestones = await Milestone.find({ project: req.params.projectId }).sort({ dueDate: 1 });
    res.status(200).json(milestones);
});

// @desc    Create milestone
// @route   POST /api/projects/:projectId/milestones
const createMilestone = asyncHandler(async (req, res) => {
    const { name, description, dueDate, startDate } = req.body;
    const project = await Project.findById(req.params.projectId);

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    const milestone = await Milestone.create({
        name,
        description,
        startDate,
        dueDate,
        project: req.params.projectId
    });

    await Activity.create({
        project: project._id,
        user: req.user.id,
        action: 'Milestone Created',
        details: `Milestone "${name}" added.`
    });

    res.status(201).json(milestone);
});

// @desc    Update milestone status
// @route   PUT /api/milestones/:id
const updateMilestone = asyncHandler(async (req, res) => {
    const milestone = await Milestone.findById(req.params.id);

    if (!milestone) {
        res.status(404);
        throw new Error('Milestone not found');
    }

    const { status } = req.body;
    const oldStatus = milestone.status;

    const updatedMilestone = await Milestone.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (status && status !== oldStatus) {
        await Activity.create({
            project: milestone.project,
            user: req.user.id,
            action: 'Milestone Updated',
            details: `Milestone "${milestone.name}" changed to ${status}.`
        });

        // Business Logic: If all milestones completed -> Project auto-moves to Completed
        if (status === 'Completed') {
            const allMilestones = await Milestone.find({ project: milestone.project });
            const allCompleted = allMilestones.every(m => m.status === 'Completed');

            if (allCompleted) {
                await Project.findByIdAndUpdate(milestone.project, { status: 'Completed' });
                await Activity.create({
                    project: milestone.project,
                    user: req.user.id,
                    action: 'Status Changed',
                    details: 'Project automatically completed because all milestones are finished.'
                });
            }
        } else if (status === 'Pending' && oldStatus === 'Completed') {
            // If a milestone is reopened, project should probably go back to Active if it was Completed
            const project = await Project.findById(milestone.project);
            if (project.status === 'Completed') {
                await Project.findByIdAndUpdate(milestone.project, { status: 'Active' });
            }
        }
    }

    res.status(200).json(updatedMilestone);
});

// @desc    Delete milestone
// @route   DELETE /api/milestones/:id
const deleteMilestone = asyncHandler(async (req, res) => {
    const milestone = await Milestone.findById(req.params.id);

    if (!milestone) {
        res.status(404);
        throw new Error('Milestone not found');
    }

    await Activity.create({
        project: milestone.project,
        user: req.user.id,
        action: 'Milestone Deleted',
        details: `Milestone "${milestone.name}" removed.`
    });

    await milestone.deleteOne();
    res.status(200).json({ id: req.params.id });
});

module.exports = {
    getMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone
};
