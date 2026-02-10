const asyncHandler = require('express-async-handler');
const Task = require('../models/taskModel');
const Project = require('../models/projectModel');
const Activity = require('../models/activityModel');
const Notification = require('../models/notificationModel');
const { sendEmail } = require('../services/emailService');

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
            if (assignee && assignee.role !== 'team_leader') {
                res.status(403);
                await task.deleteOne();
                throw new Error('Project Managers can only assign tasks to Team Leaders');
            }
        } else if (req.user.role === 'team_leader') {
            const isProjectMember = project.members.some(m => m.toString() === assignedTo.toString());

            if (!isProjectMember) {
                res.status(403);
                await task.deleteOne();
                throw new Error('Selected user is not a member of this project');
            }

            if (assignee.role !== 'team_member') {
                res.status(403);
                await task.deleteOne();
                throw new Error('Tasks can only be assigned to Team Members');
            }
        }

        // ========== NOTIFICATION: Task Assigned ==========
        if (assignedTo.toString() !== req.user.id.toString()) {
            try {
                await Notification.create({
                    recipient: assignedTo,
                    sender: req.user.id,
                    type: 'task_assigned',
                    title: 'New Task Assigned',
                    message: `You have been assigned to task: "${title}"`,
                    refModel: 'Task',
                    refId: task._id
                });
                await sendEmail({
                    recipient: assignee.email,
                    subject: `New Task Assignment: ${title}`,
                    message: `You have been assigned to a new task.\n\nTask: ${title}\nPriority: ${priority}\nDue Date: ${dueDate || 'Not set'}\n\nView details in the application.`,
                    metadata: { taskId: task._id, projectId }
                });
            } catch (err) {
                console.error('Notification/Email error:', err.message);
            }
        }
    }

    res.status(201).json(task);
});

// @desc    Update task status
// @route   PATCH /api/tasks/:id/status
// @access  Private (Assignee/TL/PM)
const updateTaskStatus = asyncHandler(async (req, res) => {
    const { status, blockedReason } = req.body;
    const task = await Task.findById(req.params.id)
        .populate('project', 'owner')
        .populate('dependencies', 'status title');

    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    const isAssignee = task.assignedTo?.toString() === req.user.id.toString();
    const isSuperior = ['super_admin', 'project_manager', 'team_leader'].includes(req.user.role);

    if (!isAssignee && !isSuperior) {
        res.status(403);
        throw new Error('You cannot update this task');
    }

    // Dependency Check
    if (['In Progress', 'Completed'].includes(status) && task.dependencies.length > 0) {
        const incompleteDependencies = task.dependencies.filter(dep => dep.status !== 'Completed');
        if (incompleteDependencies.length > 0) {
            const depTitles = incompleteDependencies.map(d => d.title).join(', ');
            res.status(400);
            throw new Error(`Cannot start this task. Waiting on dependencies: ${depTitles}`);
        }
    }

    const oldStatus = task.status;
    task.status = status;
    if (status === 'Blocked' && blockedReason) {
        task.blockedReason = blockedReason;
    }
    await task.save();

    // ========== NOTIFICATION: Task Status Updated ==========
    if (status !== oldStatus) {
        try {
            const recipients = [];

            // Notify Project Owner (PM)
            if (task.project?.owner && task.project.owner.toString() !== req.user.id.toString()) {
                recipients.push(task.project.owner);
            }

            // Notify Task Creator
            if (task.createdBy && task.createdBy.toString() !== req.user.id.toString() &&
                !recipients.some(r => r.toString() === task.createdBy.toString())) {
                recipients.push(task.createdBy);
            }

            // Notify Assignee (if they didn't make the change)
            if (task.assignedTo && task.assignedTo.toString() !== req.user.id.toString() &&
                !recipients.some(r => r.toString() === task.assignedTo.toString())) {
                recipients.push(task.assignedTo);
            }

            for (const recipientId of recipients) {
                await Notification.create({
                    recipient: recipientId,
                    sender: req.user.id,
                    type: 'task_updated',
                    title: 'Task Status Updated',
                    message: `Task "${task.title}" status changed from ${oldStatus} to ${status}`,
                    refModel: 'Task',
                    refId: task._id
                });
            }
        } catch (err) {
            console.error('Notification error:', err.message);
        }
    }

    res.status(200).json(task);
});

// @desc    Update task details
// @route   PUT /api/tasks/:id
// @access  Private (PM/Admin)
const updateTask = asyncHandler(async (req, res) => {
    const { dependencies, assignedTo: newAssignee } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    const oldAssignee = task.assignedTo?.toString();

    if (dependencies && dependencies.length > 0) {
        if (await hasCircularDependency(task._id, dependencies)) {
            res.status(400);
            throw new Error('Circular dependency detected');
        }
    }

    if (req.body.assignedTo === "") req.body.assignedTo = null;
    if (req.body.parentTask === "") req.body.parentTask = null;

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate('assignedTo', 'name email').populate('dependencies', 'title status');

    // ========== NOTIFICATION: Assignee Changed ==========
    if (newAssignee && newAssignee !== oldAssignee && newAssignee !== req.user.id.toString()) {
        try {
            await Notification.create({
                recipient: newAssignee,
                sender: req.user.id,
                type: 'task_assigned',
                title: 'Task Assigned to You',
                message: `You have been assigned to task: "${updatedTask.title}"`,
                refModel: 'Task',
                refId: updatedTask._id
            });
            await sendEmail({
                recipient: updatedTask.assignedTo.email,
                subject: `Task Assignment: ${updatedTask.title}`,
                message: `You have been assigned to task: "${updatedTask.title}".\n\nPlease review the task details.`,
                metadata: { taskId: updatedTask._id, projectId: updatedTask.project }
            });
        } catch (err) {
            console.error('Notification/Email error:', err.message);
        }
    }

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
