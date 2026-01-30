const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const TimeLog = require('../models/timeLogModel');
const Task = require('../models/taskModel');
const Project = require('../models/projectModel');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// @desc    Create time log entry
// @route   POST /api/timelogs
// @access  Private (any authenticated user)
const createTimeLog = asyncHandler(async (req, res) => {
    const { taskId, date, startTime, endTime, description, isManual } = req.body;

    // Validate task exists and user has access
    const task = await Task.findById(taskId).populate('project');
    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    // Validation: Start time must be before end time
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
        res.status(400);
        throw new Error('Start time must be before end time');
    }

    // Validation: Date cannot be in the future
    const logDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (logDate > today) {
        res.status(400);
        throw new Error('Cannot log time for future dates');
    }

    const timeLog = await TimeLog.create({
        user: req.user.id,
        task: taskId,
        project: task.project._id,
        date: logDate,
        startTime: start,
        endTime: end,
        description,
        isManual: isManual !== undefined ? isManual : true
    });

    await timeLog.populate('user', 'name');
    await timeLog.populate('task', 'title');

    res.status(201).json(timeLog);
});

// @desc    Get time logs for a user
// @route   GET /api/timelogs/user/:userId
// @access  Private (self or manager)
const getUserTimeLogs = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Users can view their own logs, managers can view team logs
    if (req.user.id !== userId && !['super_admin', 'project_manager', 'team_leader'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized to view these time logs');
    }

    const timeLogs = await TimeLog.find({ user: userId })
        .populate('task', 'title')
        .populate('project', 'name')
        .sort({ date: -1, startTime: -1 });

    res.json(timeLogs);
});

// @desc    Get time logs for a task
// @route   GET /api/timelogs/task/:taskId
// @access  Private (project members)
const getTaskTimeLogs = asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    const timeLogs = await TimeLog.find({ task: taskId })
        .populate('user', 'name')
        .sort({ date: -1, startTime: -1 });

    res.json(timeLogs);
});

// @desc    Update time log
// @route   PUT /api/timelogs/:id
// @access  Private (owner only, before approval)
const updateTimeLog = asyncHandler(async (req, res) => {
    const timeLog = await TimeLog.findById(req.params.id);

    if (!timeLog) {
        res.status(404);
        throw new Error('Time log not found');
    }

    // Only owner can update
    if (timeLog.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to update this time log');
    }

    // Cannot update if approved
    if (timeLog.isApproved) {
        res.status(400);
        throw new Error('Cannot update approved time log');
    }

    const { startTime, endTime, description } = req.body;

    if (startTime) {
        const start = new Date(startTime);
        const end = new Date(endTime || timeLog.endTime);

        if (start >= end) {
            res.status(400);
            throw new Error('Start time must be before end time');
        }

        timeLog.startTime = start;
        timeLog.endTime = end;
    }

    if (description !== undefined) timeLog.description = description;

    const updatedLog = await timeLog.save();
    await updatedLog.populate('user', 'name');
    await updatedLog.populate('task', 'title');

    res.json(updatedLog);
});

// @desc    Delete time log
// @route   DELETE /api/timelogs/:id
// @access  Private (owner only, before approval)
const deleteTimeLog = asyncHandler(async (req, res) => {
    const timeLog = await TimeLog.findById(req.params.id);

    if (!timeLog) {
        res.status(404);
        throw new Error('Time log not found');
    }

    // Only owner can delete
    if (timeLog.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to delete this time log');
    }

    // Cannot delete if approved
    if (timeLog.isApproved) {
        res.status(400);
        throw new Error('Cannot delete approved time log');
    }

    await timeLog.deleteOne();
    res.json({ id: req.params.id });
});

router.post('/', createTimeLog);
router.get('/user/:userId', getUserTimeLogs);
router.get('/task/:taskId', getTaskTimeLogs);
router.put('/:id', updateTimeLog);
router.delete('/:id', deleteTimeLog);

module.exports = router;
