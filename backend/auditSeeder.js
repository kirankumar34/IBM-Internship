const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('./models/userModel');
const Project = require('./models/projectModel');
const Task = require('./models/taskModel');
const TimeLog = require('./models/timeLogModel');
const Timesheet = require('./models/timesheetModel');
const Activity = require('./models/activityModel');
const LoginActivity = require('./models/loginActivityModel');
const Organization = require('./models/organizationModel');

dotenv.config();

const mongooseConnect = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_mgmt_app');
        console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    } catch (error) {
        console.error(`Error: ${error.message}`.red.underline.bold);
        process.exit(1);
    }
};

const comprehensiveAuditSeeder = async () => {
    try {
        await mongooseConnect();
        console.log('--- STARTING COMPREHENSIVE AUDIT & TIMESHEET SEEDER ---'.yellow.bold);

        // 1. Get Active Projects
        const projects = await Project.find({ status: 'Active' })
            .populate('members')
            .populate('owner')
            .populate('teamLeads');

        if (projects.length === 0) {
            console.log('No Active Projects Found!'.red);
            process.exit();
        }

        const org = await Organization.findOne({ name: "DWISON Technologies Pvt Ltd" });
        if (!org) {
            console.log('Orgnization not found!'.red);
            process.exit();
        }

        // Define Weekly Range: Jan 26 - Feb 01 (Last full week)
        const weekStart = new Date('2026-01-26T00:00:00.000Z');
        const weekEnd = new Date('2026-02-01T23:59:59.999Z');

        // 2. Generate Real Timesheet Data for Every Active Project & Member
        for (const project of projects) {
            console.log(`Processing Project: ${project.name}`.cyan);

            // Get Tasks for this project
            const projectTasks = await Task.find({ project: project._id });
            if (projectTasks.length === 0) continue;

            const members = project.members;
            if (members.length === 0) continue;

            for (const member of members) {
                // Check if user already has logs for this week to avoid duplication if ran twice
                const existingLogs = await TimeLog.countDocuments({
                    user: member._id,
                    project: project._id,
                    date: { $gte: weekStart, $lte: weekEnd }
                });

                if (existingLogs > 0) {
                    console.log(`Skipping ${member.name} (logs exist)`.gray);
                    continue;
                }

                let entries = [];
                let weeklyTotalHours = 0;

                // Loop Mon-Fri + occasional Sat
                for (let i = 0; i < 7; i++) {
                    const currentDay = new Date(weekStart);
                    currentDay.setDate(weekStart.getDate() + i);
                    const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'short' });

                    if (dayName === 'Sun') continue; // Always off
                    if (dayName === 'Sat' && Math.random() > 0.3) continue; // 30% chance of Sat work

                    // Daily Hours Logic (7-9.5 hrs)
                    let dailyHours = 7.0 + Math.random() * 2.5;
                    if (dayName === 'Sat') dailyHours = Math.random() * 4; // 0-4 hrs Sat

                    if (dailyHours < 0.5) continue;

                    // Pick a random task assigned to user OR any project task if unassigned
                    // Ideally pick tasks user is assigned to
                    let availableTasks = projectTasks.filter(t => t.assignedTo?.toString() === member._id.toString());
                    if (availableTasks.length === 0) availableTasks = projectTasks; // Fallback

                    const task = availableTasks[Math.floor(Math.random() * availableTasks.length)];

                    const startTime = new Date(currentDay);
                    startTime.setHours(9, 0, 0, 0); // 9 AM
                    const endTime = new Date(startTime.getTime() + dailyHours * 60 * 60 * 1000);

                    // Status Logic
                    const rand = Math.random();
                    let status = 'approved';
                    let approver = project.teamLeads.length > 0 ? project.teamLeads[0]._id : project.owner._id;

                    if (rand > 0.9) status = 'rejected';
                    else if (rand > 0.8) status = 'submitted'; // Pending

                    const timeLog = await TimeLog.create({
                        user: member._id,
                        project: project._id,
                        task: task._id,
                        date: currentDay,
                        startTime,
                        endTime,
                        duration: Math.round(dailyHours * 10) / 10,
                        description: `Work on ${task.title}: ${['Implementation', 'Bug Fixing', 'Testing', 'Refactoring', 'Documentation'][Math.floor(Math.random() * 5)]}`,
                        isManual: Math.random() > 0.5,
                        isApproved: status === 'approved',
                        approvedBy: status !== 'submitted' ? approver : null,
                        approvedAt: status !== 'submitted' ? new Date() : null
                    });

                    entries.push(timeLog._id);
                    weeklyTotalHours += timeLog.duration;

                    // 3. Generate Task Activity Log
                    await Activity.create({
                        project: project._id,
                        user: member._id,
                        action: 'Time Logged',
                        details: `${member.name} logged ${timeLog.duration} hrs on task "${task.title}"`
                    });
                }

                // Create Weekly Timesheet Record
                if (entries.length > 0) {
                    await Timesheet.create({
                        user: member._id,
                        weekStartDate: weekStart,
                        weekEndDate: weekEnd,
                        entries: entries,
                        totalHours: Math.round(weeklyTotalHours * 10) / 10,
                        status: 'approved', // Simulating mostly approved
                        approver: project.teamLeads.length > 0 ? project.teamLeads[0]._id : project.owner._id,
                        submittedAt: new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000), // Submitted Monday
                        approvedAt: new Date(weekEnd.getTime() + 48 * 60 * 60 * 1000) // Approved Tuesday
                    });

                    // Activity Log for Timesheet Submission
                    await Activity.create({
                        project: project._id,
                        user: member._id,
                        action: 'Timesheet Submitted',
                        details: `${member.name} submitted weekly timesheet for ${weekStart.toLocaleDateString()}`
                    });
                }
            }
        }

        // 4. Generate Login Audit Trails (For Super Admin Dashboard View)
        console.log('Generating Login Audit Trails...'.yellow);
        const allUsers = await User.find();

        for (const user of allUsers) {
            // Generate 3-5 login sessions per user in the last week
            const sessions = Math.floor(Math.random() * 3) + 3;

            for (let i = 0; i < sessions; i++) {
                const loginDate = new Date(weekStart);
                loginDate.setDate(loginDate.getDate() + Math.floor(Math.random() * 7));
                loginDate.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60)); // Login 8-12

                const durationHours = 4 + Math.random() * 5; // 4-9 hours session
                const logoutDate = new Date(loginDate.getTime() + durationHours * 60 * 60 * 1000);

                await LoginActivity.create({
                    user: user._id,
                    loginTime: loginDate,
                    logoutTime: logoutDate,
                    sessionDuration: Math.floor(durationHours * 3600),
                    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    isActive: false
                });
            }
        }

        console.log('--- COMPREHENSIVE AUDIT SEEDING COMPLETE ---'.green.bold.inverse);
        process.exit();

    } catch (error) {
        console.error(`Error: ${error.message}`.red);
        process.exit(1);
    }
};

comprehensiveAuditSeeder();
