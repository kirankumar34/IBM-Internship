const asyncHandler = require('express-async-handler');
const Task = require('../models/taskModel');
const Project = require('../models/projectModel');
const Activity = require('../models/activityModel');

// Helper to check for circular dependencies
const hasCircularDependency = async (taskId, dependencies) => {
    const visited = new Set();
    const queue = [...dependencies];

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (currentId.toString() === taskId.toString()) return true;

        if (!visited.has(currentId.toString())) {
            visited.add(currentId.toString());
            const task = await Task.findById(currentId);
            if (task && task.dependencies) {
                queue.push(...task.dependencies);
            }
        }
    }
    return false;
};

// @desc    Get All tasks (with optional filters)
// @route   GET /api/tasks
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
    let query = {};
    if (req.query.projectId) {
        query.project = req.query.projectId;
    }
    // If not super_admin/PM, maybe restrict? For now, let's allow fetching to support dashboard logic.

    const tasks = await Task.find(query)
        .populate('assignedTo', 'name email')
        .populate('dependencies', 'title status')
        .populate('parentTask', 'title')
        .sort({ createdAt: -1 });

    res.status(200).json(tasks);
});

// @desc    Create a task (or subtask)
// @route   POST /api/tasks
// @access  Private (TL/PM/Admin)
const createTask = asyncHandler(async (req, res) => {
    const { title, description, project: projectId, assignedTo, priority, startDate, dueDate } = req.body;
    const project = await Project.findById(projectId);

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    // Role check: Admin, PM, or Assigned Team Leader
    const isAuthorized = ['super_admin', 'project_manager'].includes(req.user.role) ||
        (req.user.role === 'team_leader' && project.teamLeads.includes(req.user.id));

    if (!isAuthorized) {
        res.status(403);
        throw new Error('You are not authorized to create tasks for this project');
    }

    const task = await Task.create({
        title,
        description,
        project: projectId,
        assignedTo: assignedTo || null,
        createdBy: req.user.id,
        priority,
        startDate,
        dueDate,
        status: 'To Do'
    });

    // Enforce Assignment Rules
    if (assignedTo) {
        const User = require('../models/userModel');
        const assignee = await User.findById(assignedTo);

        if (req.user.role === 'project_manager') {
            // PM can only assign to Team Leaders
            if (assignee && assignee.role !== 'team_leader') {
                res.status(403);
                await task.deleteOne(); // Rollback
                throw new Error('Project Managers can only assign tasks to Team Leaders');
            }
        } else if (req.user.role === 'team_leader') {
            // STRICT VALIDATION:
            // 1. Assignee must be in project.members
            const isProjectMember = project.members.some(m => m.toString() === assignedTo.toString());

            if (!isProjectMember) {
                res.status(403);
                await task.deleteOne(); // Rollback
                throw new Error('Selected user is not a member of this project');
            }

            // 2. Assignee must be a TEAM_MEMBER (Block Clients, PMs, etc.)
            if (assignee.role !== 'team_member') {
                res.status(403);
                await task.deleteOne(); // Rollback
                throw new Error('Tasks can only be assigned to Team Members');
            }

        }
    }

    res.status(201).json(task);
});

// @desc    Update task status
// @route   PUT /api/tasks/:id
// @access  Private (Assignee/TL/PM)
const updateTaskStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    // Permission check: Assignee can update to In Progress/Completed. 
    // TL/PM/Admin can update anything.
    const isAssignee = task.assignedTo?.toString() === req.user.id.toString();
    const isSuperior = ['super_admin', 'project_manager', 'team_leader'].includes(req.user.role);

    if (!isAssignee && !isSuperior) {
        res.status(403);
        throw new Error('You cannot update this task');
    }

    task.status = status;
    await task.save();

    res.status(200).json(task);
});

// @desc    Update task details
// @route   PUT /api/tasks/:id
// @access  Private (PM/Admin)
const updateTask = asyncHandler(async (req, res) => {
    const { dependencies } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    // Circular Dependency Check
    if (dependencies && dependencies.length > 0) {
        if (await hasCircularDependency(task._id, dependencies)) {
            res.status(400);
            throw new Error('Circular dependency detected');
        }
    }

    // Sanitize empty strings for ObjectIds
    if (req.body.assignedTo === "") req.body.assignedTo = null;
    if (req.body.parentTask === "") req.body.parentTask = null;

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate('assignedTo', 'name email').populate('dependencies', 'title status');

    res.status(200).json(updatedTask);
});


// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (PM/Admin)
const deleteTask = asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    await task.deleteOne();

    // Also delete subtasks?
    await Task.deleteMany({ parentTask: req.params.id });

    res.status(200).json({ id: req.params.id });
});

module.exports = {
    getTasks,
    createTask,
    updateTaskStatus,
    updateTask,
    deleteTask
};
