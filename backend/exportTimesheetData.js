const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const User = require('./models/userModel');
const Project = require('./models/projectModel');
const Task = require('./models/taskModel');
const TimeLog = require('./models/timeLogModel');
const Timesheet = require('./models/timesheetModel');
const Activity = require('./models/activityModel');

dotenv.config();

const mongooseConnect = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_mgmt_app');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const generateAndExportData = async () => {
    await mongooseConnect();
    console.log('--- REFINING DATA & EXPORTING JSON ---');

    const weekStart = new Date('2026-01-26T00:00:00.000Z');
    const weekEnd = new Date('2026-02-01T23:59:59.999Z');

    // Users to target
    const targetNames = ['Rahul Mehta', 'Arjun Rao', 'Pooja Nair'];
    const users = await User.find({ name: { $in: targetNames } });

    if (users.length === 0) {
        console.log('Target users not found. Please run timesheetSeeder.js first.');
        process.exit();
    }

    const outputData = [];

    for (const user of users) {
        // Find logs for this week
        let logs = await TimeLog.find({
            user: user._id,
            date: { $gte: weekStart, $lte: weekEnd }
        }).populate('task project');

        if (logs.length === 0) {
            console.log(`No logs found for ${user.name}. Generating fresh logs...`);
            // Fallback generation if needed (safety net)
            // ... code to generate if missing ...
            // For now assuming previous seeders ran.
        }

        // Refine Statuses (70/20/10 rule enforcement)
        let approvedCount = 0;
        let pendingCount = 0;
        let rejectedCount = 0;
        const totalLogs = logs.length;

        // We want roughly:
        const targetApproved = Math.ceil(totalLogs * 0.7);
        const targetPending = Math.ceil(totalLogs * 0.2);
        const targetRejected = totalLogs - targetApproved - targetPending;

        let currentApproved = 0;
        let currentPending = 0;
        let currentRejected = 0;

        for (const log of logs) {
            let newStatus = 'approved'; // Default
            if (currentApproved < targetApproved) {
                newStatus = 'approved';
                currentApproved++;
            } else if (currentPending < targetPending) {
                newStatus = 'submitted';
                currentPending++;
            } else {
                newStatus = 'rejected';
                currentRejected++;
            }

            // Update Log
            log.isApproved = (newStatus === 'approved');
            // If rejected, ensure we don't treat it as approved logic
            await log.save();

            // Update or Create Activity Log
            const actionType = newStatus === 'approved' ? 'Timesheet Approved' : newStatus === 'submitted' ? 'Timesheet Submitted' : 'Timesheet Rejected';

            // Check if activity exists
            const existingActivity = await Activity.findOne({
                user: user._id,
                project: log.project._id,
                details: { $regex: new RegExp(log.task.title) }
            });

            if (!existingActivity) {
                await Activity.create({
                    project: log.project._id,
                    user: user._id,
                    action: 'Time Logged',
                    details: `${user.name} logged ${log.duration} hrs on ${log.task.title}`,
                    createdAt: log.createdAt
                });
            }
        }

        // Construct JSON Output Record
        const project = logs[0]?.project || {};
        const entries = [];
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const dates = [];

        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);

            // Find log for this day
            const logForDay = logs.find(l => l.date.toISOString().split('T')[0] === d.toISOString().split('T')[0]);

            entries.push({
                day: days[i],
                task: logForDay ? logForDay.task.title : null,
                hours: logForDay ? logForDay.duration : 0.0
            });
        }

        const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
        const overallStatus = currentRejected > 0 ? 'REJECTED' : (currentPending > 0 ? 'PENDING' : 'APPROVED');

        const record = {
            userId: user._id.toString(),
            userName: user.name,
            role: user.role.toUpperCase(),
            projectId: project._id?.toString() || "",
            projectName: project.name || "Unknown",
            weekRange: "2026-01-26_to_2026-02-01",
            entries: entries,
            totalHours: Math.round(totalHours * 10) / 10,
            approvalStatus: overallStatus
        };

        outputData.push(record);
    }

    // Write to JSON file
    const outputPath = path.join(__dirname, 'mockTimesheetData.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

    console.log(`Mock Data Exported to ${outputPath}`);
    console.log(JSON.stringify(outputData, null, 2));

    process.exit();
};

generateAndExportData();
