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

    // Check if timesheet for this week is already approved
    const Timesheet = require('../models/timesheetModel');
    const weekStart = new Date(logDate);
    weekStart.setDate(logDate.getDate() - logDate.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const existingTimesheet = await Timesheet.findOne({
        user: req.user.id,
        weekStartDate: weekStart,
        status: 'approved'
    });

    if (existingTimesheet) {
        res.status(400);
        throw new Error('Cannot log time to an already approved week');
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

// @desc    Generate mock time logs from existing tasks (runs once per user)
// @route   POST /api/timelogs/generate-mock
// @access  Private
const generateMockTimeLogs = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Check if mock data already exists for this user
    const existingLogs = await TimeLog.countDocuments({ user: userId });
    if (existingLogs > 0) {
        return res.json({ message: 'Time logs already exist', count: existingLogs });
    }

    // Get tasks assigned to or created by this user
    const tasks = await Task.find({
        $or: [
            { assignedTo: userId },
            { createdBy: userId }
        ]
    }).populate('project', 'name');

    if (tasks.length === 0) {
        return res.json({ message: 'No tasks found to generate time logs', count: 0 });
    }

    const mockLogs = [];
    const today = new Date();

    // Generate logs for past 4 weeks
    for (let week = 0; week < 4; week++) {
        // Monday to Friday only
        for (let day = 1; day <= 5; day++) {
            const logDate = new Date(today);
            logDate.setDate(logDate.getDate() - (week * 7) - (today.getDay() - day));

            // Skip future dates
            if (logDate > today) continue;

            logDate.setHours(0, 0, 0, 0);

            // Random 1-3 tasks per day
            const tasksPerDay = Math.floor(Math.random() * 3) + 1;
            let dailyHoursRemaining = 8;

            for (let t = 0; t < tasksPerDay && dailyHoursRemaining > 0; t++) {
                const task = tasks[Math.floor(Math.random() * tasks.length)];

                // Random 1-4 hours per entry
                const hours = Math.min(Math.floor(Math.random() * 4) + 1, dailyHoursRemaining);
                dailyHoursRemaining -= hours;

                const startHour = 9 + (8 - dailyHoursRemaining - hours);
                const startTime = new Date(logDate);
                startTime.setHours(startHour, 0, 0, 0);

                const endTime = new Date(startTime);
                endTime.setHours(startHour + hours, 0, 0, 0);

                mockLogs.push({
                    user: userId,
                    task: task._id,
                    project: task.project._id,
                    date: logDate,
                    startTime,
                    endTime,
                    duration: hours, // Duration in hours
                    description: `Worked on ${task.title}`,
                    isManual: true,
                    isApproved: week >= 2 // Older entries are approved
                });
            }
        }
    }

    // Insert all mock logs
    if (mockLogs.length > 0) {
        await TimeLog.insertMany(mockLogs);
    }

    res.status(201).json({
        message: 'Mock time logs generated',
        count: mockLogs.length
    });
});

// @desc    Get weekly time logs for current user
// @route   GET /api/timelogs/weekly
// @access  Private
const getWeeklyTimeLogs = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { weekStart } = req.query;

    let startDate;
    if (weekStart) {
        startDate = new Date(weekStart);
    } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Monday
    }
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const timeLogs = await TimeLog.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
    })
        .populate('task', 'title')
        .populate('project', 'name')
        .sort({ date: 1, startTime: 1 });

    // Group by task and calculate daily totals
    const taskMap = {};
    const dailyTotals = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    timeLogs.forEach(log => {
        const taskId = log.task?._id?.toString() || 'unassigned';
        if (!taskMap[taskId]) {
            taskMap[taskId] = {
                task: log.task,
                project: log.project,
                hours: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
                total: 0
            };
        }

        const dayName = days[new Date(log.date).getDay()];
        taskMap[taskId].hours[dayName] += log.duration;
        taskMap[taskId].total += log.duration;
        dailyTotals[dayName] += log.duration;
    });

    res.json({
        weekStart: startDate,
        weekEnd: endDate,
        entries: Object.values(taskMap),
        dailyTotals,
        weeklyTotal: Object.values(dailyTotals).reduce((a, b) => a + b, 0)
    });
});

router.post('/', createTimeLog);
router.get('/user/:userId', getUserTimeLogs);
router.get('/task/:taskId', getTaskTimeLogs);
router.get('/weekly', getWeeklyTimeLogs);
router.post('/generate-mock', generateMockTimeLogs);
router.put('/:id', updateTimeLog);
router.delete('/:id', deleteTimeLog);

module.exports = router;
