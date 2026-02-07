const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const TimerSession = require('../models/timerSessionModel');
const TimeLog = require('../models/timeLogModel');
const Task = require('../models/taskModel');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// @desc    Start timer for a task
// @route   POST /api/timer/start
// @access  Private
const startTimer = asyncHandler(async (req, res) => {
    const { taskId, description } = req.body;

    // Check if user already has an active timer
    const existingTimer = await TimerSession.findOne({ user: req.user.id, isActive: true });
    if (existingTimer) {
        res.status(400);
        throw new Error('You already have an active timer. Stop it before starting a new one.');
    }

    // Validate task
    const task = await Task.findById(taskId).populate('project');
    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    const timer = await TimerSession.create({
        user: req.user.id,
        task: taskId,
        project: task.project._id,
        description: description || '',
        startTime: new Date(),
        isActive: true
    });

    await timer.populate('task', 'title');
    await timer.populate('project', 'name');

    res.status(201).json(timer);
});

// @desc    Stop active timer
// @route   POST /api/timer/stop
// @access  Private
const stopTimer = asyncHandler(async (req, res) => {
    const timer = await TimerSession.findOne({ user: req.user.id, isActive: true });

    if (!timer) {
        res.status(404);
        throw new Error('No active timer found');
    }

    const endTime = new Date();
    const durationMs = endTime - timer.startTime;
    const durationSeconds = Math.floor(durationMs / 1000);
    const durationHours = durationSeconds / 3600;

    // Validation: Max 8 hours per day
    const dayStart = new Date(timer.startTime); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(timer.startTime); dayEnd.setHours(23, 59, 59, 999);

    // Convert Mongoose model if needed or use straight require if not available in scope (it is required at top)
    const existingLogs = await TimeLog.find({
        user: req.user.id,
        date: { $gte: dayStart, $lte: dayEnd }
    });

    const totalHours = existingLogs.reduce((acc, log) => acc + log.duration, 0);

    if (totalHours + durationHours > 8) {
        res.status(400);
        throw new Error(`Daily limit exceeded. Total: ${totalHours.toFixed(1)}h + New: ${durationHours.toFixed(1)}h > 8h. Timer remains active.`);
    }

    timer.endTime = endTime;
    timer.duration = durationSeconds;
    timer.isActive = false;
    await timer.save();

    // Create TimeLog entry from timer session
    const timeLog = await TimeLog.create({
        user: req.user.id,
        task: timer.task,
        project: timer.project,
        date: timer.startTime,
        startTime: timer.startTime,
        endTime: endTime,
        duration: durationHours,
        description: timer.description || 'Timer session',
        isManual: false
    });

    await timeLog.populate('task', 'title');
    await timeLog.populate('project', 'name');

    res.json({
        timer,
        timeLog,
        duration: {
            seconds: durationSeconds,
            hours: Math.round(durationHours * 100) / 100,
            formatted: formatDuration(durationSeconds)
        }
    });
});

// @desc    Get active timer
// @route   GET /api/timer/active
// @access  Private
const getActiveTimer = asyncHandler(async (req, res) => {
    const timer = await TimerSession.findOne({ user: req.user.id, isActive: true })
        .populate('task', 'title')
        .populate('project', 'name');

    if (!timer) {
        return res.json(null);
    }

    // Calculate current duration
    const now = new Date();
    const durationSeconds = Math.floor((now - timer.startTime) / 1000);

    res.json({
        ...timer.toObject(),
        currentDuration: {
            seconds: durationSeconds,
            formatted: formatDuration(durationSeconds)
        }
    });
});

// @desc    Discard active timer without saving
// @route   DELETE /api/timer/discard
// @access  Private
const discardTimer = asyncHandler(async (req, res) => {
    const timer = await TimerSession.findOne({ user: req.user.id, isActive: true });

    if (!timer) {
        res.status(404);
        throw new Error('No active timer found');
    }

    await timer.deleteOne();
    res.json({ message: 'Timer discarded' });
});

// Helper function to format duration
const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

router.post('/start', startTimer);
router.post('/stop', stopTimer);
router.get('/active', getActiveTimer);
router.delete('/discard', discardTimer);

module.exports = router;
