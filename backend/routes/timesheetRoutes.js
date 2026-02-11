const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Timesheet = require('../models/timesheetModel');
const TimeLog = require('../models/timeLogModel');
const { protect, authorize } = require('../middleware/authMiddleware');
const Project = require('../models/projectModel');
const { createNotification } = require('../services/notificationService');

router.use(protect);

// Helper function to convert week ID to date range
function getWeekDates(weekId) {
    const [year, week] = weekId.split('-W').map(Number);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const weekStart = new Date(simple);
    weekStart.setDate(simple.getDate() - dow + (dow === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
}

// Helper function to get week start from a date object
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}

// Helper function to get week end from week start
function getWeekEnd(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
}

// @desc    Get or create weekly timesheet
// @route   GET /api/timesheets/user/:userId/week/:weekId
// @access  Private (self or manager)
const getWeeklyTimesheet = asyncHandler(async (req, res) => {
    try {
        const { userId, weekId } = req.params;

        // Authorization check
        // Users can see their own. 
        // Managers can see if they supervise the user.
        // Super Admin sees all.
        let isAuthorized = req.user.id === userId || req.user.role === 'super_admin';

        if (!isAuthorized && ['project_manager', 'team_leader'].includes(req.user.role)) {
            // Strict Check: PM/TL must be leading a project where the user is a member
            const commonProjects = await Project.countDocuments({
                $or: [{ owner: req.user.id }, { teamLeads: req.user.id }],
                members: userId
            });
            isAuthorized = commonProjects > 0;
        }

        if (!isAuthorized) {
            res.status(403);
            throw new Error('Not authorized to view this timesheet');
        }

        const { weekStart, weekEnd } = getWeekDates(weekId);

        // Get all time logs for this week
        const timeLogs = await TimeLog.find({
            user: userId,
            date: { $gte: weekStart, $lte: weekEnd }
        });

        // Find or create timesheet
        let timesheet = await Timesheet.findOne({
            user: userId,
            weekStartDate: weekStart
        });

        // Determine Status
        // If no timesheet exists, status is draft.
        // If exists, keep status.

        if (!timesheet) {
            // Create new timesheet with time logs from that week
            timesheet = await Timesheet.create({
                user: userId,
                weekStartDate: weekStart,
                weekEndDate: weekEnd,
                entries: timeLogs.map(log => log._id),
                status: 'draft',
                totalHours: timeLogs.reduce((acc, log) => acc + log.duration, 0)
            });
        } else {
            // Ensure entries are synced (in case logs were added separately)
            // Check if logs count mismatches
            const currentEntryIds = timesheet.entries.map(id => id.toString());
            const logsIds = timeLogs.map(log => log._id.toString());

            const needsSync = logsIds.some(id => !currentEntryIds.includes(id)) || logsIds.length !== currentEntryIds.length;

            if (needsSync) {
                timesheet.entries = logsIds;
                timesheet.totalHours = timeLogs.reduce((acc, log) => acc + log.duration, 0);
                await timesheet.save();
            }
        }

        await timesheet.populate({
            path: 'entries',
            populate: { path: 'task', select: 'title project' } // Fetch task title AND project
        });
        // Deep populate project for task to show Project Name in UI if needed
        // But basic populate above should be enough if task has project ref

        await timesheet.populate('approver', 'name');

        res.json(timesheet);
    } catch (error) {
        console.error('getWeeklyTimesheet Error:', error);
        const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
        res.status(statusCode).json({ message: error.message });
    }
});

// @desc    Save/Update timesheet entries
// @route   POST /api/timesheets/save
// @access  Private (Self only, Draft only)
const saveTimesheetErrors = asyncHandler(async (req, res) => {
    const { timesheetId, entries } = req.body;
    // entries: [{ taskId, dayIndex (0-6), duration }]

    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
        res.status(404);
        throw new Error('Timesheet not found');
    }

    if (timesheet.user.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to edit this timesheet');
    }

    if (timesheet.status !== 'draft') {
        res.status(400);
        throw new Error('Cannot edit submitted or approved timesheets');
    }

    const { weekStart } = getWeekDatesUsingDate(timesheet.weekStartDate);

    // Process Entries
    // We assume entries coming in are the DELTAS or VALUES for specific cells
    // Strategy: We can Upsert TimeLogs.

    for (const entry of entries) {
        // Calculate date
        const logDate = new Date(weekStart);
        logDate.setDate(weekStart.getDate() + entry.dayIndex);
        logDate.setHours(12, 0, 0, 0); // Noon to avoid timezone shifts affecting date

        if (entry.duration <= 0) {
            // Remove log if 0
            await TimeLog.findOneAndDelete({
                user: req.user.id,
                task: entry.taskId,
                date: {
                    $gte: new Date(logDate.setHours(0, 0, 0, 0)),
                    $lt: new Date(logDate.setHours(23, 59, 59, 999))
                }
            });
        } else {
            // Validate Daily Limit (8 hours)
            const startOfDay = new Date(logDate); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(logDate); endOfDay.setHours(23, 59, 59, 999);

            const existingLogs = await TimeLog.find({
                user: req.user.id,
                date: { $gte: startOfDay, $lte: endOfDay }
            });

            // Exclude current task from total (since we are replacing it)
            const otherLogs = existingLogs.filter(l => l.task.toString() !== entry.taskId);
            const dailyTotal = otherLogs.reduce((acc, l) => acc + l.duration, 0) + entry.duration;

            if (dailyTotal > 8) {
                res.status(400);
                throw new Error(`Daily limit exceeded. Total hours for ${logDate.toLocaleDateString()} cannot exceed 8.`);
            }

            // Calculate dummy start/end based on duration for schema compliance
            // Default start: 9:00 AM
            const start = new Date(logDate);
            start.setHours(9, 0, 0, 0);
            const end = new Date(start.getTime() + entry.duration * 3600000);

            // Upsert
            await TimeLog.findOneAndUpdate(
                {
                    user: req.user.id,
                    task: entry.taskId,
                    date: {
                        $gte: new Date(logDate.setHours(0, 0, 0, 0)),
                        $lt: new Date(logDate.setHours(23, 59, 59, 999))
                    }
                },
                {
                    user: req.user.id,
                    task: entry.taskId,
                    project: entry.projectId, // Need project Id passed
                    date: logDate,
                    startTime: start,
                    endTime: end,
                    duration: entry.duration
                },
                { upsert: true, new: true, runValidators: true }
            );
        }
    }

    // Resync timesheet
    const updatedLogs = await TimeLog.find({
        user: req.user.id,
        date: { $gte: timesheet.weekStartDate, $lte: timesheet.weekEndDate }
    });

    timesheet.entries = updatedLogs.map(l => l._id);
    timesheet.totalHours = updatedLogs.reduce((acc, l) => acc + l.duration, 0);
    await timesheet.save();

    res.json(timesheet);
});

// Helper for date obj
const getWeekDatesUsingDate = (dateObj) => {
    const simple = new Date(dateObj);
    simple.setHours(0, 0, 0, 0);
    return { weekStart: simple };
};


// @desc    Submit timesheet for approval
// @route   POST /api/timesheets/submit
// @access  Private (owner only)
const submitTimesheet = asyncHandler(async (req, res) => {
    const { timesheetId } = req.body;

    const timesheet = await Timesheet.findById(timesheetId).populate('user');

    if (!timesheet) {
        res.status(404);
        throw new Error('Timesheet not found');
    }

    // Only owner can submit
    if (timesheet.user._id.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized to submit this timesheet');
    }

    // Cannot submit if already submitted or approved
    if (timesheet.status !== 'draft' && timesheet.status !== 'rejected') {
        res.status(400);
        throw new Error(`Cannot submit timesheet with status: ${timesheet.status}`);
    }

    timesheet.status = 'submitted';
    timesheet.submittedAt = new Date();
    timesheet.rejectionReason = null;

    await timesheet.save();

    // Audit Log
    const Activity = require('../models/activityModel');
    await Activity.create({
        user: req.user.id,
        action: 'Timesheet Submitted',
        details: `Weekly timesheet (Start: ${timesheet.weekStartDate.toLocaleDateString()}) submitted.`
    });

    // Notify Project Managers & Leads of projects involved in this timesheet
    try {
        await timesheet.populate({
            path: 'entries',
            populate: { path: 'project' } // Get projects
        });

        // Collect unique project IDs
        const projectIds = [...new Set(timesheet.entries.map(e => e.project?._id?.toString()).filter(Boolean))];

        // Find PMs and TLs of these projects
        const relevantProjects = await Project.find({ _id: { $in: projectIds } });

        const recipients = new Set();
        relevantProjects.forEach(p => {
            if (p.owner) recipients.add(p.owner.toString());
            if (p.teamLeads) p.teamLeads.forEach(tl => recipients.add(tl.toString()));
        });

        // Add Super Admins just in case
        const superAdmins = await require('../models/userModel').find({ role: 'super_admin' });
        superAdmins.forEach(sa => recipients.add(sa._id.toString()));

        for (const recipientId of recipients) {
            await createNotification({
                recipient: recipientId,
                sender: req.user.id,
                type: 'timesheet_submitted',
                title: 'Timesheet Submitted',
                message: `${timesheet.user.name} submitted their timesheet.`,
                refModel: 'Timesheet',
                refId: timesheet._id
            });
        }

    } catch (err) {
        console.error('Notification error:', err.message);
    }

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

    if (!['super_admin', 'project_manager', 'project_admin'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized to approve timesheets.');
    }

    if (timesheet.status !== 'submitted') {
        res.status(400);
        throw new Error(`Cannot approve timesheet with status: ${timesheet.status}`);
    }

    timesheet.status = 'approved';
    timesheet.approver = req.user.id;
    timesheet.approvedAt = new Date();

    if (req.user.role === 'super_admin') {
        timesheet.rejectionReason = 'Administrative Override';
    }

    await TimeLog.updateMany(
        { _id: { $in: timesheet.entries.map(e => e._id) } },
        { isApproved: true, approvedBy: req.user.id, approvedAt: new Date() }
    );

    await timesheet.save();

    // Audit
    const Activity = require('../models/activityModel');
    await Activity.create({
        user: req.user.id,
        action: 'Timesheet Approved',
        details: `Approved timesheet for ${timesheet.user.name}.`
    });

    // Notify User
    await createNotification({
        recipient: timesheet.user._id,
        sender: req.user.id,
        type: 'timesheet_approved',
        title: 'Timesheet Approved',
        message: `Your timesheet for week starting ${new Date(timesheet.weekStartDate).toLocaleDateString()} has been approved.`,
        refModel: 'Timesheet',
        refId: timesheet._id
    });

    // Email Simulation
    const { sendEmail } = require('../services/emailService');
    await sendEmail({
        recipient: timesheet.user.email,
        recipientName: timesheet.user.name,
        subject: 'Timesheet Approved',
        body: `Your timesheet for week starting ${new Date(timesheet.weekStartDate).toLocaleDateString()} has been approved.`,
        type: 'notification',
        metadata: { timesheetId: timesheet._id }
    });

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

    if (!['super_admin', 'project_manager', 'project_admin'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized to reject timesheets');
    }

    if (!reason) {
        res.status(400);
        throw new Error('Rejection reason is mandatory');
    }

    timesheet.status = 'rejected';
    timesheet.rejectionReason = reason;
    timesheet.approver = req.user.id;

    await timesheet.save();

    // Audit
    const Activity = require('../models/activityModel');
    await Activity.create({
        user: req.user.id,
        action: 'Timesheet Rejected',
        details: `Rejected timesheet for ${timesheet.user.name}. Reason: ${reason}`
    });

    // Notify User
    await createNotification({
        recipient: timesheet.user._id,
        sender: req.user.id,
        type: 'timesheet_rejected',
        title: 'Timesheet Rejected',
        message: `Your timesheet was rejected: ${reason}`,
        refModel: 'Timesheet',
        refId: timesheet._id
    });

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

    // Role-based filtering
    let filter = { status: 'submitted' };

    // If PM or TL, only show timesheets from users in their projects/teams
    if (req.user.role !== 'super_admin') {
        // Find projects where user is owner or team lead
        const projects = await Project.find({
            $or: [{ owner: req.user.id }, { teamLeads: req.user.id }]
        }).populate('members teamLeads');

        const memberIds = new Set();
        projects.forEach(p => {
            p.members.forEach(m => memberIds.add(m.toString()));
            p.teamLeads.forEach(tl => memberIds.add(tl.toString()));
            // Also include PMs assistant if needed? No generally members.
        });

        if (memberIds.size === 0) {
            return res.json([]); // No members to approve
        }

        filter.user = { $in: Array.from(memberIds) };
    }

    const timesheets = await Timesheet.find(filter)
        .populate('user', 'name email role')
        .populate({
            path: 'entries',
            populate: { path: 'project', select: 'name' }
        })
        .sort({ submittedAt: -1 });

    res.json(timesheets);
});

router.get('/user/:userId/week/:weekId', getWeeklyTimesheet);
router.post('/save', saveTimesheetErrors);
router.post('/submit', submitTimesheet);
router.put('/:id/approve', approveTimesheet);
router.put('/:id/reject', rejectTimesheet);
router.get('/pending', getPendingTimesheets);

module.exports = router;
