const asyncHandler = require('express-async-handler');
const Project = require('../models/projectModel');
const Task = require('../models/taskModel');
const Issue = require('../models/issueModel');
const Milestone = require('../models/milestoneModel');
const Template = require('../models/templateModel');
const Activity = require('../models/activityModel');
const User = require('../models/userModel');
const { calculateProjectProgress } = require('../utils/analyticsHelper');

// @desc    Get all projects (filtered by role and archive status)
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
    const { role, id } = req.user;
    const { archived } = req.query;

    let query = { isArchived: archived === 'true' };

    // If not admin, filter by ownership or membership
    if (role !== 'super_admin') {
        query = {
            ...query,
            $or: [{ owner: id }, { members: id }, { teamLeads: id }]
        };
    }

    const projects = await Project.find(query)
        .populate('owner', 'name email role')
        .populate('assistantPm', 'name email role')
        .populate({ path: 'members', select: 'name email role teamId', populate: { path: 'teamId', select: 'name' } })
        .populate({ path: 'teamLeads', select: 'name email role teamId', populate: { path: 'teamId', select: 'name' } })
        .sort({ createdAt: -1 });

    const enrichedProjects = await Promise.all(projects.map(async (p) => {
        const progress = await calculateProjectProgress(p._id);
        const issueCount = await Issue.countDocuments({ project: p._id, status: 'Open' });

        return {
            ...p.toObject(),
            progress,
            stats: {
                openIssues: issueCount
            }
        };
    }));

    res.status(200).json(enrichedProjects);
});

// @desc    Get single project details
// @route   GET /api/projects/:id
// @access  Private
const getProject = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id)
        .populate('owner', 'name email role')
        .populate('assistantPm', 'name email role')
        .populate({ path: 'members', select: 'name email role teamId', populate: { path: 'teamId', select: 'name' } })
        .populate({ path: 'teamLeads', select: 'name email role teamId', populate: { path: 'teamId', select: 'name' } });

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    const milestones = await Milestone.find({ project: project._id }).sort({ dueDate: 1 });
    const activities = await Activity.find({ project: project._id }).populate('user', 'name').sort({ createdAt: -1 }).limit(10);

    const progress = await calculateProjectProgress(project._id);

    res.status(200).json({
        ...project.toObject(),
        progress,
        milestones,
        activities
    });
});

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Admin/PM only)
const createProject = asyncHandler(async (req, res) => {
    const { name, description, startDate, endDate, members, teamLeads, priority, templateId, primaryPmId, assistantPmId } = req.body;

    if (!name || !startDate || !endDate || !primaryPmId) {
        res.status(400);
        throw new Error('Please provide name, startDate, endDate and Primary Project Manager');
    }

    if (new Date(startDate) >= new Date(endDate)) {
        res.status(400);
        throw new Error('Start date must be before end date');
    }

    // Validate PM roles
    const primaryPm = await User.findById(primaryPmId);
    if (!primaryPm || primaryPm.role !== 'project_manager') {
        res.status(400);
        throw new Error('Selected Primary Project Manager is invalid or does not have PM role');
    }

    if (assistantPmId) {
        const assistantPm = await User.findById(assistantPmId);
        if (!assistantPm || assistantPm.role !== 'project_manager') {
            res.status(400);
            throw new Error('Selected Assistant Project Manager is invalid or does not have PM role');
        }
    }

    const project = await Project.create({
        name,
        description,
        startDate,
        endDate,
        priority: priority || 'Medium',
        owner: primaryPmId,
        assistantPm: assistantPmId || null,
        members: members || [],
        teamLeads: teamLeads || []
    });

    // Handle Template Cloning
    if (templateId) {
        const template = await Template.findById(templateId);
        if (template) {
            const start = new Date(startDate);

            // Clone Milestones
            if (template.milestones && template.milestones.length > 0) {
                const milestonesToCreate = template.milestones.map(m => {
                    const dueDate = new Date(start);
                    dueDate.setDate(dueDate.getDate() + m.relativeDueDays);
                    return {
                        name: m.name,
                        description: m.description,
                        project: project._id,
                        dueDate: dueDate,
                        status: 'Pending'
                    };
                });
                await Milestone.insertMany(milestonesToCreate);
            }

            // Clone Tasks
            if (template.tasks && template.tasks.length > 0) {
                const tasksToCreate = template.tasks.map(t => {
                    const dueDate = new Date(start);
                    if (t.relativeDueDays) dueDate.setDate(dueDate.getDate() + t.relativeDueDays);
                    return {
                        title: t.title,
                        description: t.description,
                        project: project._id,
                        priority: t.priority,
                        status: 'To Do',
                        dueDate: t.relativeDueDays ? dueDate : null,
                        createdBy: req.user.id
                    };
                });
                await Task.insertMany(tasksToCreate);
            }
        }
    }

    await Activity.create({
        project: project._id,
        user: req.user.id,
        action: 'Created',
        details: `Project "${name}" was created.`
    });

    res.status(201).json(project);
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Owner/Admin only)
const updateProject = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    if (project.owner.toString() !== req.user.id && req.user.role !== 'super_admin') {
        res.status(403);
        throw new Error('Not authorized to update this project');
    }

    const { status } = req.body;

    if (status && status !== project.status) {
        await Activity.create({
            project: project._id,
            user: req.user.id,
            action: 'Status Changed',
            details: `Status changed from ${project.status} to ${status}`
        });
    }

    const updatedProject = await Project.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate('owner members teamLeads');

    res.status(200).json(updatedProject);
});

// @desc    Archive / Restore project (Soft delete)
const archiveProject = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    if (project.owner.toString() !== req.user.id && req.user.role !== 'super_admin' && req.user.role !== 'project_admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    project.isArchived = !project.isArchived;
    await project.save();

    await Activity.create({
        project: project._id,
        user: req.user.id,
        action: project.isArchived ? 'Archived' : 'Restored',
        details: `Project was ${project.isArchived ? 'archived' : 'restored'}.`
    });

    res.status(200).json(project);
});

// @desc    Add member to project
// @desc    Add member to project
const addMemberToProject = asyncHandler(async (req, res) => {
    const { userId, roleAs } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    const member = await User.findById(userId);
    if (!member) {
        res.status(404);
        throw new Error('User not found');
    }

    const callerRole = req.user.role;
    // Super Admin/PA PM Assignment Logic
    if ((callerRole === 'super_admin' || callerRole === 'project_admin') && member.role === 'project_manager') {
        // Enforce max 2 PMs
        const isOwner = project.owner?.toString() === userId;
        const isAssistant = project.assistantPm?.toString() === userId;

        if (isOwner || isAssistant) {
            res.status(400);
            throw new Error('This Project Manager is already assigned to this project');
        }

        if (project.owner && project.assistantPm) {
            res.status(400);
            throw new Error('This project already has a Primary and Assistant Project Manager');
        }

        let assignedType = '';
        if (!project.owner) {
            project.owner = userId;
            assignedType = 'Primary Project Manager';
        } else if (!project.assistantPm) {
            project.assistantPm = userId;
            assignedType = 'Assistant Project Manager';
        }

        await project.save();
        await Activity.create({
            project: project._id,
            user: req.user.id,
            action: `${assignedType} assigned`,
            details: `${member.name} appointed as ${assignedType}.`
        });

        return res.status(200).json(project);
    }

    // Normal Member Assignment Logic
    if (callerRole === 'team_leader' && member.role !== 'team_member') {
        res.status(403);
        throw new Error('Team Leaders can only add Team Members.');
    }

    // PA/SuperAdmin trying to add non-PM
    if (callerRole === 'project_admin' && member.role !== 'project_manager') {
        res.status(403);
        throw new Error('Project Admins can only assign Project Managers.');
    }

    // PM Assignment Logic
    if (callerRole === 'project_manager') {
        const isProjectOwner = project.owner?.toString() === req.user.id || project.assistantPm?.toString() === req.user.id;
        if (!isProjectOwner) {
            res.status(403);
            throw new Error('You are not authorized to manage this project');
        }

        // PM can ONLY assign Team Leads
        if (roleAs !== 'team_leader' || member.role !== 'team_leader') {
            res.status(403);
            throw new Error('Project Managers can only assign Team Leaders to the project.');
        }

        if (project.teamLeads.includes(userId)) {
            res.status(400);
            throw new Error('This Team Leader is already assigned to this project');
        }
    }

    if (callerRole === 'super_admin' && member.role === 'project_manager') {
        // Should have been caught above, but safety fallthrough
    }

    if (roleAs === 'team_leader') {
        if (!project.teamLeads.includes(userId)) project.teamLeads.push(userId);
    } else {
        if (!project.members.includes(userId)) project.members.push(userId);
    }

    await project.save();

    await Activity.create({
        project: project._id,
        user: req.user.id,
        action: 'Member Added',
        details: `${member.name} assigned as ${roleAs.replace('_', ' ')}.`
    });

    res.status(200).json(project);
});

// @desc    Delete project
const deleteProject = asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    if (req.user.role !== 'super_admin') {
        res.status(403);
        throw new Error('Only Super Admin can permanently delete projects');
    }

    await project.deleteOne();
    res.status(200).json({ id: req.params.id });
});

// @desc    Edit Project Managers (Primary & Assistant) - Super Admin Only
const updateProjectManagers = asyncHandler(async (req, res) => {
    const { primaryPmId, assistantPmId } = req.body;
    const project = await Project.findById(req.params.id)
        .populate('owner', 'name')
        .populate('assistantPm', 'name');

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    if (req.user.role !== 'super_admin' && req.user.role !== 'project_admin') {
        res.status(403);
        throw new Error('Only Super Admin or Project Admin can edit Project Managers');
    }

    // Validation 1: Primary PM is mandatory
    if (!primaryPmId) {
        res.status(400);
        throw new Error('Primary Project Manager is required');
    }

    // Validation 2: Cannot be same user
    if (primaryPmId === assistantPmId) {
        res.status(400);
        throw new Error('Primary and Assistant PM cannot be the same user');
    }

    // Verify Users are actually PMs (Optional but good)
    const User = require('../models/userModel');
    const primaryUser = await User.findById(primaryPmId);
    if (!primaryUser || primaryUser.role !== 'project_manager') {
        res.status(400);
        throw new Error('Selected Primary user is not a Project Manager');
    }

    let assistantUser = null;
    if (assistantPmId) {
        assistantUser = await User.findById(assistantPmId);
        if (!assistantUser || assistantUser.role !== 'project_manager') {
            res.status(400);
            throw new Error('Selected Assistant user is not a Project Manager');
        }
    }

    const oldPrimaryName = project.owner ? project.owner.name : 'None';
    const oldAssistantName = project.assistantPm ? project.assistantPm.name : 'None';

    // Update
    project.owner = primaryPmId;
    project.assistantPm = assistantPmId || null;

    const updatedProject = await project.save();

    // Logs
    if (oldPrimaryName !== primaryUser.name) {
        await Activity.create({
            project: project._id,
            user: req.user.id,
            action: 'Primary PM Changed',
            details: `Primary PM changed from ${oldPrimaryName} to ${primaryUser.name}`
        });
    }

    if (oldAssistantName !== (assistantUser ? assistantUser.name : 'None')) {
        await Activity.create({
            project: project._id,
            user: req.user.id,
            action: 'Assistant PM Changed',
            details: `Assistant PM changed from ${oldAssistantName} to ${assistantUser ? assistantUser.name : 'None'}`
        });
    }

    res.status(200).json(updatedProject);
});

module.exports = {
    getProjects,
    getProject,
    createProject,
    updateProject,
    archiveProject,
    addMemberToProject,
    deleteProject,
    updateProjectManagers
};
