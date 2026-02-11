const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('./models/userModel');
const Project = require('./models/projectModel');
const Task = require('./models/taskModel');
const TimeLog = require('./models/timeLogModel');
const Timesheet = require('./models/timesheetModel');
const Activity = require('./models/activityModel');
const Milestone = require('./models/milestoneModel');
const LoginActivity = require('./models/loginActivityModel');

dotenv.config();

const connectDB = async () => {
    try {
        const DB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_mgmt_app';
        console.log(`Connecting to: ${DB_URI.includes('127.0.0.1') ? 'Localhost' : 'Remote DB'}`.yellow);
        const conn = await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    } catch (error) {
        console.error(`Error: ${error.message}`.red.underline.bold);
        process.exit(1);
    }
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateProjectData = async () => {
    await connectDB();
    console.log('--- STARTING ADVANCED PROJECT DATA SEEDING ---'.yellow.bold);

    const projects = await Project.find().populate('members teamLeads');
    console.log(`Found ${projects.length} projects to process...`);

    for (const project of projects) {
        console.log(`Processing [${project.status}] Project: ${project.name}`.cyan);

        // 1. Define Timeline based on Project Status
        const now = new Date();
        let startDate = new Date();
        startDate.setDate(now.getDate() - 60); // Started 60 days ago

        let lastLogDate = new Date(); // Default to today

        if (project.status === 'Completed') {
            lastLogDate = new Date();
            lastLogDate.setDate(now.getDate() - 14); // Finished 2 weeks ago
        } else if (project.status === 'On Hold') {
            lastLogDate = new Date();
            lastLogDate.setDate(now.getDate() - 21); // Paused 3 weeks ago
        }

        // 2. Ensure Tasks & Milestones align with Status
        // Get or Create Tasks
        let tasks = await Task.find({ project: project._id });
        if (tasks.length < 5) {
            // Create more tasks if needed
            const taskTitles = [
                'Requirements Analysis', 'System Design', 'Database Setup',
                'API Development', 'Frontend Integration', 'Unit Testing',
                'UAT', 'Deployment', 'Documentation', 'Bug Fixes'
            ];
            for (let i = 0; i < 5; i++) {
                const t = await Task.create({
                    title: `${taskTitles[i]} - ${project.name.split(' ').slice(0, 2).join('')}`,
                    description: 'Generated detailed task for analytics',
                    project: project._id,
                    status: project.status === 'Completed' ? 'Completed' : 'To Do',
                    priority: getRandomItem(['Medium', 'High']),
                    startDate,
                    dueDate: lastLogDate
                });
                tasks.push(t);
            }
        }

        // Fix Task Status for Completed Projects
        if (project.status === 'Completed') {
            await Task.updateMany({ project: project._id }, { status: 'Completed', progress: 100 });
            await Milestone.updateMany({ project: project._id }, { status: 'Completed' });
        }

        // 3. Generate Weekly Time Logs (Backfill 8 weeks)
        const members = project.members.length > 0 ? project.members : (project.teamLeads.length > 0 ? project.teamLeads : []);

        if (members.length === 0) continue;

        // Iterate weeks backwards
        for (let w = 0; w < 8; w++) {
            const weekStart = new Date(lastLogDate);
            weekStart.setDate(lastLogDate.getDate() - (w * 7) - 6); // Go back w weeks

            // Check if this week is before project start (ignore)
            if (weekStart < startDate) continue;

            // Stop generating logs for "On Hold" / "Completed" if we pass their "end" date? 
            // Logic handled by 'lastLogDate' being set earlier.

            for (const member of members) {
                let weeklyTotal = 0;
                let entries = [];

                // 20% chance user was on leave/idle this week
                if (Math.random() > 0.8) continue;

                // Process Mon-Fri
                for (let d = 0; d < 5; d++) {
                    const logDate = new Date(weekStart);
                    logDate.setDate(weekStart.getDate() + d);

                    // Skip Future
                    if (logDate > now) continue;

                    // Daily Hours (Random 4-9)
                    const workedHours = getRandomInt(40, 90) / 10;

                    // Pick Task
                    const task = getRandomItem(tasks);

                    // Specific Description Logic as requested
                    const descriptions = [
                        `Working on ${task.title} logic implementation`,
                        `Debugging ${task.title} edge cases`,
                        `Optimizing queries for ${task.title}`,
                        `Reviewing PRs related to ${task.title}`,
                        `Client meeting regarding ${task.title} status`,
                        `Refactoring ${task.title} module`
                    ];

                    // Create Log
                    const log = await TimeLog.create({
                        user: member._id,
                        project: project._id,
                        task: task._id,
                        date: logDate,
                        startTime: new Date(logDate.setHours(9, 0, 0)),
                        endTime: new Date(logDate.setHours(9 + Math.floor(workedHours), (workedHours % 1) * 60, 0)),
                        duration: workedHours,
                        description: getRandomItem(descriptions),
                        isManual: Math.random() > 0.3,
                        isApproved: true, // Auto approve historical
                        approvedBy: project.teamLeads[0]?._id,
                        approvedAt: new Date(logDate.getTime() + 86400000)
                    });

                    weeklyTotal += workedHours;
                    entries.push(log._id);

                    // Generate "Contribution" Activity for "Who worked on what" view
                    // Only 1 activity per day per user to avoid spamming
                    const exists = await Activity.findOne({
                        user: member._id,
                        project: project._id,
                        date: { $gte: new Date(logDate.setHours(0, 0, 0)), $lt: new Date(logDate.setHours(23, 59, 59)) }
                    });

                    if (!exists) {
                        await Activity.create({
                            project: project._id,
                            user: member._id,
                            action: 'Task Progress',
                            details: `${member.name} contributed ${workedHours}h to ${task.title}`,
                            createdAt: logDate
                        });
                    }
                }

                // If logs generated, create Timesheet
                if (entries.length > 0) {
                    // Check existing first
                    const tsExists = await Timesheet.findOne({ user: member._id, weekStartDate: weekStart });
                    if (!tsExists) {
                        await Timesheet.create({
                            user: member._id,
                            weekStartDate: weekStart,
                            weekEndDate: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
                            entries: entries,
                            totalHours: weeklyTotal,
                            status: 'approved',
                            submittedAt: new Date(weekStart.getTime() + 5 * 24 * 60 * 60 * 1000),
                            approvedAt: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
                        });
                    }
                }
            }
        }
    }

    console.log('--- ADVANCED SEEDING COMPLETE ---'.green.bold.inverse);
    process.exit();
};

generateProjectData();
