const asyncHandler = require('express-async-handler');
const Project = require('../models/projectModel');
const Task = require('../models/taskModel');
const TimeLog = require('../models/timeLogModel');
const User = require('../models/userModel');
const { calculateProjectProgress } = require('../utils/analyticsHelper');

// Helper to format date
const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '';

// @desc    Export Projects to CSV
// @route   GET /api/reports/projects/export
// @access  Private
const exportProjectsCSV = asyncHandler(async (req, res) => {
    let query = {};
    if (req.user.role !== 'super_admin') {
        query = {
            $or: [{ owner: req.user.id }, { members: req.user.id }, { teamLeads: req.user.id }]
        };
    }

    const projects = await Project.find(query).populate('owner', 'name');

    // Add header
    let csv = `ID,Name,Status,Owner,Start Date,End Date,Created At\n`;

    for (const project of projects) {
        csv += `"${project._id}","${project.name}",${project.status},"${project.owner?.name || 'N/A'}",${formatDate(project.startDate)},${formatDate(project.endDate)},${formatDate(project.createdAt)}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=projects_report.csv');
    res.status(200).send(csv);
});

// @desc    Export Tasks to CSV
// @route   GET /api/reports/tasks/export
// @access  Private
const exportTasksCSV = asyncHandler(async (req, res) => {
    // Determine accessible projects first
    let projectQuery = {};
    if (req.user.role !== 'super_admin') {
        projectQuery = {
            $or: [{ owner: req.user.id }, { members: req.user.id }, { teamLeads: req.user.id }]
        };
    }
    const projects = await Project.find(projectQuery).select('_id');
    const projectIds = projects.map(p => p._id);

    // Find tasks in those projects OR assigned to user
    const tasks = await Task.find({
        $or: [
            { project: { $in: projectIds } },
            { assignedTo: req.user.id }
        ]
    }).populate('project', 'name').populate('assignedTo', 'name');

    let csv = `ID,Title,Project,Status,Priority,Assignee,Due Date,Created At\n`;

    for (const task of tasks) {
        csv += `"${task._id}","${task.title}","${task.project?.name || 'N/A'}",${task.status},${task.priority},"${task.assignedTo?.name || 'Unassigned'}",${formatDate(task.dueDate)},${formatDate(task.createdAt)}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks_report.csv');
    res.status(200).send(csv);
});

// @desc    Export Timesheets to CSV
// @route   GET /api/reports/timesheets/export
// @access  Private
const exportTimesheetsCSV = asyncHandler(async (req, res) => {
    // Similar access control logic
    let projectQuery = {};
    if (req.user.role !== 'super_admin') {
        projectQuery = {
            $or: [{ owner: req.user.id }, { members: req.user.id }, { teamLeads: req.user.id }]
        };
    }
    const projects = await Project.find(projectQuery).select('_id');
    const projectIds = projects.map(p => p._id);

    const timelogs = await TimeLog.find({
        $or: [
            { project: { $in: projectIds } },
            { user: req.user.id }
        ]
    }).populate('user', 'name').populate('project', 'name').populate('task', 'title');

    let csv = `Date,User,Project,Task,Hours,Status,Description\n`;

    for (const log of timelogs) {
        csv += `${formatDate(log.date)},"${log.user?.name || 'Unknown'}","${log.project?.name || 'N/A'}","${log.task?.title || 'General'}",${log.duration},${log.isApproved ? 'Approved' : 'Pending'},"${log.description || ''}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=timesheets_report.csv');
    res.status(200).send(csv);
});

module.exports = {
    exportProjectsCSV,
    exportTasksCSV,
    exportTimesheetsCSV
};
