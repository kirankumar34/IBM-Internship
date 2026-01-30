const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const LoginActivity = require('../models/loginActivityModel');
const TimeLog = require('../models/timeLogModel');
const Timesheet = require('../models/timesheetModel');
const Project = require('../models/projectModel');
const Task = require('../models/taskModel');
const Milestone = require('../models/milestoneModel');
const User = require('../models/userModel');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('super_admin')); // All analytics endpoints are Super Admin only

// @desc    Get all users' login/logout activity
// @route   GET /api/analytics/login-activity
// @access  Private (Super Admin only)
const getLoginActivity = asyncHandler(async (req, res) => {
    const { startDate, endDate, userId } = req.query;

    let query = {};

    if (userId) {
        query.user = userId;
    }

    if (startDate || endDate) {
        query.loginTime = {};
        if (startDate) query.loginTime.$gte = new Date(startDate);
        if (endDate) query.loginTime.$lte = new Date(endDate);
    }

    const activities = await LoginActivity.find(query)
        .populate('user', 'name email role')
        .sort({ loginTime: -1 })
        .limit(500); // Limit for performance

    // Aggregate statistics
    const activeUsers = await LoginActivity.find({ isActive: true })
        .populate('user', 'name email role');

    res.json({
        activities,
        stats: {
            totalSessions: activities.length,
            activeSessions: activeUsers.length,
            activeUsers: activeUsers.map(a => ({
                user: a.user,
                loginTime: a.loginTime
            }))
        }
    });
});

// @desc    Get project-wise employee activity
// @route   GET /api/analytics/project/:projectId/activity
// @access  Private (Super Admin only)
const getProjectActivity = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
        .populate('owner', 'name email')
        .populate('assistantPm', 'name email')
        .populate('members', 'name email role');

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    // Get all users involved in the project
    const userIds = [
        project.owner?._id,
        project.assistantPm?._id,
        ...project.members.map(m => m._id)
    ].filter(Boolean);

    // Get login activity for these users
    const loginActivities = await LoginActivity.find({
        user: { $in: userIds }
    })
        .populate('user', 'name email role')
        .sort({ loginTime: -1 })
        .limit(200);

    // Get time logs for this project
    const timeLogs = await TimeLog.find({ project: projectId })
        .populate('user', 'name email')
        .populate('task', 'title')
        .sort({ date: -1 });

    // Aggregate by user
    const userActivity = {};
    userIds.forEach(userId => {
        const user = project.members.find(m => m._id.toString() === userId.toString())
            || (project.owner?._id.toString() === userId.toString() ? project.owner : null)
            || (project.assistantPm?._id.toString() === userId.toString() ? project.assistantPm : null);

        if (user) {
            userActivity[userId] = {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                logins: loginActivities.filter(a => a.user._id.toString() === userId.toString()),
                timeLogs: timeLogs.filter(t => t.user._id.toString() === userId.toString()),
                totalHours: timeLogs
                    .filter(t => t.user._id.toString() === userId.toString())
                    .reduce((sum, t) => sum + t.duration, 0)
            };
        }
    });

    res.json({
        project: {
            id: project._id,
            name: project.name,
            owner: project.owner,
            assistantPm: project.assistantPm
        },
        userActivity: Object.values(userActivity)
    });
});

// @desc    Get project progress data for charts
// @route   GET /api/analytics/project/:projectId/progress
// @access  Private (Super Admin only)
const getProjectProgress = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    // Milestone progress
    const milestones = await Milestone.find({ project: projectId });
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'Completed').length;
    const milestoneProgress = totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    // Task completion
    const tasks = await Task.find({ project: projectId });
    const tasksByStatus = {
        'To Do': tasks.filter(t => t.status === 'To Do').length,
        'In Progress': tasks.filter(t => t.status === 'In Progress').length,
        'Done': tasks.filter(t => t.status === 'Done').length
    };
    const taskCompletionRate = tasks.length > 0
        ? Math.round((tasksByStatus['Done'] / tasks.length) * 100)
        : 0;

    // Weekly effort from timesheets (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const timeLogs = await TimeLog.find({
        project: projectId,
        date: { $gte: eightWeeksAgo }
    });

    // Group by week
    const weeklyEffort = {};
    timeLogs.forEach(log => {
        const weekStart = new Date(log.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyEffort[weekKey]) {
            weeklyEffort[weekKey] = 0;
        }
        weeklyEffort[weekKey] += log.duration;
    });

    const weeklyEffortArray = Object.keys(weeklyEffort)
        .sort()
        .map(week => ({
            week,
            hours: Math.round(weeklyEffort[week] * 10) / 10
        }));

    res.json({
        project: {
            id: project._id,
            name: project.name
        },
        milestones: {
            total: totalMilestones,
            completed: completedMilestones,
            progress: milestoneProgress,
            byStatus: {
                'Completed': completedMilestones,
                'In Progress': milestones.filter(m => m.status === 'In Progress').length,
                'Pending': milestones.filter(m => m.status === 'Pending').length
            }
        },
        tasks: {
            total: tasks.length,
            byStatus: tasksByStatus,
            completionRate: taskCompletionRate
        },
        weeklyEffort: weeklyEffortArray,
        overallProgress: Math.round((milestoneProgress + taskCompletionRate) / 2)
    });
});

// @desc    Get project timesheet summary
// @route   GET /api/analytics/project/:projectId/timesheets
// @access  Private (Super Admin only)
const getProjectTimesheets = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { weekStart, weekEnd } = req.query;

    const project = await Project.findById(projectId);
    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    let query = { project: projectId };

    if (weekStart || weekEnd) {
        query.date = {};
        if (weekStart) query.date.$gte = new Date(weekStart);
        if (weekEnd) query.date.$lte = new Date(weekEnd);
    }

    const timeLogs = await TimeLog.find(query)
        .populate('user', 'name email role')
        .populate('task', 'title');

    // Group by user
    const userTimesheets = {};
    timeLogs.forEach(log => {
        const userId = log.user._id.toString();
        if (!userTimesheets[userId]) {
            userTimesheets[userId] = {
                user: log.user,
                totalHours: 0,
                entries: []
            };
        }
        userTimesheets[userId].totalHours += log.duration;
        userTimesheets[userId].entries.push(log);
    });

    const timesheetArray = Object.values(userTimesheets).map(ts => ({
        ...ts,
        totalHours: Math.round(ts.totalHours * 10) / 10
    }));

    res.json({
        project: {
            id: project._id,
            name: project.name
        },
        timesheets: timesheetArray,
        totalProjectHours: Math.round(
            timesheetArray.reduce((sum, ts) => sum + ts.totalHours, 0) * 10
        ) / 10
    });
});

router.get('/login-activity', getLoginActivity);
router.get('/project/:projectId/activity', getProjectActivity);
router.get('/project/:projectId/progress', getProjectProgress);
router.get('/project/:projectId/timesheets', getProjectTimesheets);

module.exports = router;
