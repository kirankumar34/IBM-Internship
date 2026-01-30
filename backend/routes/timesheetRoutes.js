const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Timesheet = require('../models/timesheetModel');
const TimeLog = require('../models/timeLogModel');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Helper function to get week start and end dates
const getWeekDates = (weekId) => {
    // weekId format: "YYYY-Wnn" (e.g., "2024-W05")
    const [year, week] = weekId.split('-W');
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const weekStart = new Date(simple);
    weekStart.setDate(simple.getDate() - dow + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
};

// @desc    Get or create weekly timesheet
// @route   GET /api/timesheets/user/:userId/week/:weekId
// @access  Private (self or manager)
const getWeeklyTimesheet = asyncHandler(async (req, res) => {
    const { userId, weekId } = req.params;

    // Authorization check
    if (req.user.id !== userId && !['super_admin', 'project_manager', 'team_leader'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized to view this timesheet');
    }

    const { weekStart, weekEnd } = getWeekDates(weekId);

    // Find or create timesheet
    let timesheet = await Timesheet.findOne({
        user: userId,
        weekStartDate: weekStart
    }).populate({
        path: 'entries',
        populate: { path: 'task', select: 'title' }
    }).populate('approver', 'name');

    if (!timesheet) {
        // Create new timesheet with time logs from that week
        const timeLogs = await TimeLog.find({
            user: userId,
            date: { $gte: weekStart, $lte: weekEnd }
        });

        timesheet = await Timesheet.create({
            user: userId,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            entries: timeLogs.map(log => log._id),
            status: 'draft'
        });

        await timesheet.calculateTotalHours();
        await timesheet.save();

        await timesheet.populate({
            path: 'entries',
            populate: { path: 'task', select: 'title' }
        });
    }

    res.json(timesheet);
});

// @desc    Submit timesheet for approval
// @route   POST /api/timesheets/submit
// @access  Private (owner only)
const submitTimesheet = asyncHandler(async (req, res) => {
    const { timesheetId } = req.body;

    const timesheet = await Timesheet.findById(timesheetId);

    if (!timesheet) {
        res.status(404);
        throw new Error('Timesheet not found');
    }

    // Only owner can submit
    if (timesheet.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to submit this timesheet');
    }

    // Cannot submit if already submitted or approved
    if (timesheet.status !== 'draft') {
        res.status(400);
        throw new Error(`Cannot submit timesheet with status: ${timesheet.status}`);
    }

    timesheet.status = 'submitted';
    timesheet.submittedAt = new Date();

    await timesheet.save();
    await timesheet.populate('entries');
    await timesheet.populate('user', 'name');

    res.json(timesheet);
});

// @desc    Approve timesheet
// @route   PUT /api/timesheets/:id/approve
// @access  Private (managers only)
const approveTimesheet = asyncHandler(async (req, res) => {
    const timesheet = await Timesheet.findById(req.params.id)
        .populate('user', 'name teamId')
        .populate('entries');

    if (!timesheet) {
        res.status(404);
        throw new Error('Timesheet not found');
    }

    // Only managers can approve
    if (!['super_admin', 'project_manager', 'team_leader'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized to approve timesheets');
    }

    // Cannot approve if not submitted
    if (timesheet.status !== 'submitted') {
        res.status(400);
        throw new Error(`Cannot approve timesheet with status: ${timesheet.status}`);
    }

    timesheet.status = 'approved';
    timesheet.approver = req.user.id;
    timesheet.approvedAt = new Date();

    // Mark all time log entries as approved
    await TimeLog.updateMany(
        { _id: { $in: timesheet.entries.map(e => e._id) } },
        { isApproved: true, approvedBy: req.user.id, approvedAt: new Date() }
    );

    await timesheet.save();
    await timesheet.populate('approver', 'name');

    res.json(timesheet);
});

// @desc    Reject timesheet
// @route   PUT /api/timesheets/:id/reject
// @access  Private (managers only)
const rejectTimesheet = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const timesheet = await Timesheet.findById(req.params.id).populate('user', 'name');

    if (!timesheet) {
        res.status(404);
        throw new Error('Timesheet not found');
    }

    // Only managers can reject
    if (!['super_admin', 'project_manager', 'team_leader'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized to reject timesheets');
    }

    if (timesheet.status !== 'submitted') {
        res.status(400);
        throw new Error(`Cannot reject timesheet with status: ${timesheet.status}`);
    }

    timesheet.status = 'rejected';
    timesheet.rejectionReason = reason || 'No reason provided';
    timesheet.approver = req.user.id;

    await timesheet.save();
    res.json(timesheet);
});

// @desc    Get pending timesheets for approval
// @route   GET /api/timesheets/pending
// @access  Private (managers only)
const getPendingTimesheets = asyncHandler(async (req, res) => {
    if (!['super_admin', 'project_manager', 'team_leader'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized to view pending timesheets');
    }

    const timesheets = await Timesheet.find({ status: 'submitted' })
        .populate('user', 'name email')
        .sort({ submittedAt: -1 });

    res.json(timesheets);
});

router.get('/user/:userId/week/:weekId', getWeeklyTimesheet);
router.post('/submit', submitTimesheet);
router.put('/:id/approve', approveTimesheet);
router.put('/:id/reject', rejectTimesheet);
router.get('/pending', getPendingTimesheets);

module.exports = router;
