const asyncHandler = require('express-async-handler');
const LoginActivity = require('../models/loginActivityModel');
const TimeLog = require('../models/timeLogModel');
const Project = require('../models/projectModel');
const Task = require('../models/taskModel');
const Milestone = require('../models/milestoneModel');
const User = require('../models/userModel');
const IndividualTimesheet = require('../models/timesheetModel');
const PDFDocument = require('pdfkit');
const { calculateProjectProgress } = require('../utils/analyticsHelper');

// @desc    Get global analytics (filtered by role)
// @route   GET /api/analytics/global
const getGlobalStats = asyncHandler(async (req, res) => {
    try {
        const { role, id: userId } = req.user;

        let projectQuery = {};
        if (role !== 'super_admin') {
            projectQuery = {
                $or: [{ owner: userId }, { members: userId }, { teamLeads: userId }]
            };
        }

        const projects = await Project.find(projectQuery);
        const projectIds = projects.map(p => p._id);

        const totalProjects = projects.length;

        // Calculate global metrics based only on projects the user can see
        const tasks = await Task.find({ project: { $in: projectIds } });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'Completed').length;

        // EXACT formula requested for global completion: (Completed Tasks / Total Tasks) * 100
        const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const milestones = await Milestone.find({ project: { $in: projectIds } });

        // Global effort (hours) - Approved only
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const timeLogs = await TimeLog.find({
            project: { $in: projectIds },
            isApproved: true
        });

        // Total Hours
        const totalHours = Math.round(timeLogs.reduce((sum, log) => sum + log.duration, 0) * 10) / 10;

        // Weekly Trend (last 8 weeks)
        const recentLogs = timeLogs.filter(log => new Date(log.date) >= eightWeeksAgo);
        const weeklyEffortMap = {};

        recentLogs.forEach(log => {
            const weekStart = new Date(log.date);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
            const weekKey = weekStart.toISOString().split('T')[0];
            weeklyEffortMap[weekKey] = (weeklyEffortMap[weekKey] || 0) + log.duration;
        });

        const globalWeeklyEffort = Object.keys(weeklyEffortMap)
            .sort()
            .map(week => ({
                name: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: Math.round(weeklyEffortMap[week] * 10) / 10
            }));

        // Per-project effort breakdown (only for admin)
        let projectEffort = [];
        if (role === 'super_admin') {
            const allLogs = await TimeLog.find({});
            const effortMap = {};
            allLogs.forEach(l => {
                effortMap[l.project] = (effortMap[l.project] || 0) + l.duration;
            });

            projectEffort = projects.map(p => ({
                name: p.name,
                hours: Math.round((effortMap[p._id] || 0) * 10) / 10
            })).sort((a, b) => b.hours - a.hours).slice(0, 5);
        }

        const pendingHours = await IndividualTimesheet.find({ status: 'submitted' }).then(tss => tss.reduce((s, t) => s + t.totalHours, 0));

        res.json({
            totalProjects,
            totalUsers: await User.countDocuments(role === 'super_admin' ? {} : { organizationId: req.user.organizationId }),
            totalTasks,
            totalHours,
            pendingHours, // Added for admin overview
            projectEffort, // Added for admin overview
            taskCompletionRate, // Used by dashboard
            avgCompletionRate: taskCompletionRate, // Legacy alias
            globalWeeklyEffort, // Added for dashboard chart
            projectStatus: {
                active: projects.filter(p => p.status === 'Active').length,
                completed: projects.filter(p => p.status === 'Completed').length,
                onHold: projects.filter(p => p.status === 'On Hold').length
            },
            milestoneStats: {
                total: milestones.length,
                completed: milestones.filter(m => m.status === 'Completed').length
            }
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get project progress data
// @route   GET /api/analytics/project/:projectId/progress
const getProjectProgress = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    const milestones = await Milestone.find({ project: projectId });
    const tasks = await Task.find({ project: projectId });

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'Completed').length;
    const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const tasksByStatus = {
        'To Do': tasks.filter(t => t.status === 'To Do').length,
        'In Progress': tasks.filter(t => t.status === 'In Progress').length,
        'Completed': tasks.filter(t => t.status === 'Completed').length,
        'Blocked': tasks.filter(t => t.status === 'Blocked').length,
    };

    // Overall standardized progress
    const overallProgress = await calculateProjectProgress(projectId);

    // Weekly effort (Last 8 weeks) - ONLY APPROVED TIMESHEETS
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const timeLogs = await TimeLog.find({
        project: projectId,
        date: { $gte: eightWeeksAgo },
        isApproved: true
    });

    const weeklyEffort = {};
    timeLogs.forEach(log => {
        const weekStart = new Date(log.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyEffort[weekKey] = (weeklyEffort[weekKey] || 0) + log.duration;
    });

    const weeklyEffortArray = Object.keys(weeklyEffort).sort().map(week => ({
        week,
        hours: Math.round(weeklyEffort[week] * 10) / 10
    }));

    res.json({
        id: project._id,
        name: project.name,
        overallProgress,
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
            completionRate: tasks.length > 0 ? Math.round((tasksByStatus['Completed'] / tasks.length) * 100) : 0
        },
        weeklyEffort: weeklyEffortArray
    });
});

// @desc    Get Detailed Project Activity (Super Admin only for full, PM/TL for assigned)
const getProjectActivity = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate('owner assistantPm members teamLeads');

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    const timeLogs = await TimeLog.find({ project: projectId }).populate('user', 'name role').sort({ date: -1 });
    const activities = await require('../models/activityModel').find({ project: projectId }).populate('user', 'name').sort({ createdAt: -1 });

    res.json({
        project: { id: project._id, name: project.name },
        activities,
        timeLogs: timeLogs.slice(0, 50)
    });
});

// @desc    Get Login Activity (Super Admin Only)
const getLoginActivity = asyncHandler(async (req, res) => {
    const activities = await LoginActivity.find()
        .populate('user', 'name email role')
        .sort({ loginTime: -1 })
        .limit(100);

    res.json({ activities });
});

// @desc    Project PDF Report
const getProjectPDF = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate('owner');
    if (!project) { res.status(404); throw new Error('Project not found'); }

    const milestones = await Milestone.find({ project: projectId });
    const tasks = await Task.find({ project: projectId });
    const progress = await calculateProjectProgress(projectId);

    const doc = new PDFDocument();
    res.setHeader('Content-disposition', `attachment; filename=Report_${project.name}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Activity Log
    const Activity = require('../models/activityModel');
    await Activity.create({
        project: projectId,
        user: req.user.id,
        action: 'PDF Downloaded',
        details: `Progress report for project "${project.name}" was downloaded.`
    });

    doc.fontSize(25).text('Project Progress Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Project: ${project.name}`);
    doc.text(`Overall Progress: ${progress}%`);
    doc.text(`Status: ${project.status}`);
    doc.moveDown();
    doc.text(`Total Tasks: ${tasks.length}`);
    doc.text(`Completed Tasks: ${tasks.filter(t => t.status === 'Completed').length}`);
    doc.moveDown();
    doc.text(`Total Milestones: ${milestones.length}`);
    doc.text(`Completed Milestones: ${milestones.filter(m => m.status === 'Completed').length}`);

    doc.end();
});

// @desc    Project CSV Report
const getProjectCSV = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate('owner');
    if (!project) { res.status(404); throw new Error('Project not found'); }

    const milestones = await Milestone.find({ project: projectId });
    const tasks = await Task.find({ project: projectId }).populate('assignedTo');
    const timeLogs = await TimeLog.find({ project: projectId }).populate('user');
    const progress = await calculateProjectProgress(projectId);

    let csv = `Project Report\n`;
    csv += `Name,${project.name}\n`;
    csv += `Status,${project.status}\n`;
    csv += `Progress,${progress}%\n`;
    csv += `Total Tasks,${tasks.length}\n`;
    csv += `Total Effort,${Math.round(timeLogs.reduce((acc, t) => acc + t.duration, 0) * 10) / 10} hours\n\n`;

    csv += `TASKS\n`;
    csv += `Title,Status,Unpriority,Assignee,Due Date\n`;
    tasks.forEach(t => {
        csv += `"${t.title}",${t.status},${t.priority},"${t.assignedTo?.name || 'Unassigned'}",${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''}\n`;
    });
    csv += `\n`;

    csv += `MILESTONES\n`;
    csv += `Name,Status,Due Date,Description\n`;
    milestones.forEach(m => {
        csv += `"${m.name}",${m.status},${m.dueDate ? new Date(m.dueDate).toLocaleDateString() : ''},"${m.description || ''}"\n`;
    });
    csv += `\n`;

    csv += `TIME UTILIZATION\n`;
    csv += `User,Date,Hours,Task,Status\n`;
    timeLogs.forEach(l => {
        csv += `"${l.user?.name || 'Unknown'}",${new Date(l.date).toLocaleDateString()},${l.duration},"${l.task ? 'Task Related' : 'General'}",${l.isApproved ? 'Approved' : 'Pending'}\n`;
    });

    res.setHeader('Content-disposition', `attachment; filename=Report_${project.name}.csv`);
    res.setHeader('Content-type', 'text/csv');
    res.send(csv);

    // log activity
    await require('../models/activityModel').create({
        project: projectId, user: req.user.id, action: 'CSV Downloaded', details: `CSV Report for project "${project.name}"`
    });
});

// @desc    Get project timesheet analytics
// @route   GET /api/analytics/project/:projectId/timesheets
const getProjectTimesheets = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    // Get all time logs for this project
    const timeLogs = await TimeLog.find({ project: projectId })
        .populate('user', 'name role')
        .populate('task', 'title')
        .sort({ date: -1 });

    // Group by user
    const userMap = {};
    timeLogs.forEach(log => {
        if (!log.user) return;
        const userId = log.user._id.toString();
        if (!userMap[userId]) {
            userMap[userId] = {
                user: {
                    _id: log.user._id,
                    name: log.user.name,
                    role: log.user.role
                },
                totalHours: 0,
                entries: []
            };
        }
        userMap[userId].totalHours += log.duration || 0;
        if (userMap[userId].entries.length < 5) {
            userMap[userId].entries.push({
                task: log.task,
                date: log.date,
                duration: log.duration
            });
        }
    });

    const timesheets = Object.values(userMap).sort((a, b) => b.totalHours - a.totalHours);
    const totalProjectHours = Math.round(timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0) * 10) / 10;

    res.json({
        project: { id: project._id, name: project.name },
        timesheets,
        totalProjectHours
    });
});

module.exports = {
    getGlobalStats,
    getProjectProgress,
    getProjectActivity,
    getLoginActivity,
    getProjectPDF,
    getProjectCSV,
    getProjectTimesheets
};
