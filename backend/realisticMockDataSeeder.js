const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('./models/userModel');
const Project = require('./models/projectModel');
const Task = require('./models/taskModel');
const TimeLog = require('./models/timeLogModel');
const Timesheet = require('./models/timesheetModel');
const Activity = require('./models/activityModel');

dotenv.config();

const mongooseConnect = async () => {
    try {
        const DB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_mgmt_app';
        console.log(`Connecting to: ${DB_URI.includes('127.0.0.1') ? 'Localhost' : 'Remote DB'}`.yellow);
        const conn = await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    } catch (error) {
        console.error(`Error: ${error.message}`.red);
        process.exit(1);
    }
};

const comprehensiveAuditSeeder = async () => {
    try {
        await mongooseConnect();
        console.log('--- STARTING COMPREHENSIVE MOCK DATA GENERATION ---'.yellow.bold);

        // Targeted Date Range: Jan 26 - Feb 01, 2026
        const weekStart = new Date('2026-01-26T00:00:00.000Z');
        const weekEnd = new Date('2026-02-01T23:59:59.999Z');

        // 1. Get All Projects (Active, On Hold, Completed)
        const projects = await Project.find({}).populate('members teamLeads owner');

        if (projects.length === 0) {
            console.log('No Projects Found! Use projectSeeder.js first.'.red);
            process.exit();
        }

        // 2. Iterate Per Project to generate tailored data
        for (const project of projects) {
            console.log(`Processing [${project.status}] Project: ${project.name}`.cyan);

            // Get Tasks
            let tasks = await Task.find({ project: project._id });

            // If no tasks, create dummy tasks for this project context
            if (tasks.length === 0) {
                const dummyTitles = ['Project Setup', 'Requirements Gathering', 'Design Phase', 'Development', 'Testing'];
                for (let title of dummyTitles) {
                    tasks.push(await Task.create({
                        title: title + ` - ${project.name.substring(0, 10)}`,
                        project: project._id,
                        status: 'To Do',
                        priority: 'Medium',
                        startDate: weekStart,
                        dueDate: weekEnd
                    }));
                }
            }

            // Determine if we should log time based on status
            // Active: Full logs
            // On Hold: No logs this week (stopped previously)
            // Completed: No logs this week (finished previously)

            if (project.status !== 'Active') {
                console.log(`Skipping logs for ${project.status} project`.gray);
                // Ideally, we backfill history, but user asked for "Realistic Mock Data for Weekly Timesheets" which implies CURRENT week visibility
                // However, for "Analytics Progress", completed projects need 100% completion.

                if (project.status === 'Completed') {
                    // Ensure tasks are marked completed
                    await Task.updateMany({ project: project._id }, { status: 'Completed', progress: 100 });
                }
                continue;
            }

            // 3. Generate Timesheet & Activity for ACTIVE projects
            const members = project.members.length > 0 ? project.members : (project.teamLeads.length > 0 ? project.teamLeads : []);
            if (members.length === 0) continue;

            for (const member of members) {
                // Eliminate duplicates for this week
                const existingLogs = await TimeLog.countDocuments({
                    user: member._id,
                    project: project._id,
                    date: { $gte: weekStart, $lte: weekEnd }
                });

                if (existingLogs > 0) continue;

                let entries = [];
                let weeklyTotalHours = 0;

                // Working Days
                for (let i = 0; i < 7; i++) {
                    const currentDay = new Date(weekStart);
                    currentDay.setDate(weekStart.getDate() + i);
                    const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'short' });

                    // Simulating Realistic Work Patterns
                    if (dayName === 'Sun') continue; // Off
                    if (dayName === 'Sat' && Math.random() > 0.4) continue; // Occasional Sat

                    // Daily Hours: 6 - 9.5
                    const dailyHours = 6.0 + Math.random() * 3.5;
                    const workedHours = Math.round(dailyHours * 10) / 10;

                    // Pick Task
                    const task = tasks[Math.floor(Math.random() * tasks.length)];

                    // Task-Specific Descriptions for "Who is working on what"
                    const actionVerbs = ['Developing', 'Testing', 'Debugging', 'Refactoring', 'Analyzing', 'Documenting'];
                    const desc = `${actionVerbs[Math.floor(Math.random() * actionVerbs.length)]} ${task.title} module logic`;

                    const startTime = new Date(currentDay);
                    startTime.setHours(9, 0, 0, 0); // 9 AM
                    const endTime = new Date(startTime.getTime() + workedHours * 60 * 60 * 1000);

                    // Create LOG
                    const timeLog = await TimeLog.create({
                        user: member._id,
                        project: project._id,
                        task: task._id,
                        date: currentDay,
                        startTime,
                        endTime,
                        duration: workedHours,
                        description: desc,
                        isManual: true,
                        isApproved: true, // Auto-approve for demo
                        approvedBy: project.teamLeads[0]?._id || project.owner._id,
                        approvedAt: new Date()
                    });

                    entries.push(timeLog._id);
                    weeklyTotalHours += workedHours;

                    // Create DETAILED Activity for "Employee Activity View"
                    // "Who worked on what at which time"
                    await Activity.create({
                        project: project._id,
                        user: member._id,
                        action: 'Task Progress', // Key for filtering
                        details: `${member.name} worked ${workedHours}h on ${task.title} (${dayName})`,
                        createdAt: endTime // Log at end of work
                    });
                }

                // Create Weekly Timesheet Wrapper
                if (entries.length > 0) {
                    await Timesheet.create({
                        user: member._id,
                        weekStartDate: weekStart,
                        weekEndDate: weekEnd,
                        entries: entries,
                        totalHours: Math.round(weeklyTotalHours * 10) / 10,
                        status: 'approved',
                        submittedAt: new Date(weekStart.getTime() + 5 * 24 * 60 * 60 * 1000), // Friday
                        approvedAt: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
                    });
                }
            }
        }

        console.log('--- REALISTIC MOCK DATA GENERATION COMPLETE ---'.green.bold.inverse);
        process.exit();

    } catch (error) {
        console.error(`Error: ${error.message}`.red);
        process.exit(1);
    }
};

comprehensiveAuditSeeder();
