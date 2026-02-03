const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/userModel');
const Project = require('./models/projectModel');
const Task = require('./models/taskModel');
const TimeLog = require('./models/timeLogModel');
const Timesheet = require('./models/timesheetModel');

dotenv.config();

const seedMockTimesheets = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_mgmt_app');
        console.log('Connected to MongoDB for Seeding...');

        // Clear existing timesheets and time logs for the mock week
        const weekStart = new Date('2026-02-02T00:00:00.000Z'); // Monday
        const weekEnd = new Date('2026-02-08T23:59:59.999Z');   // Sunday

        await Timesheet.deleteMany({ weekStartDate: weekStart });
        await TimeLog.deleteMany({ date: { $gte: weekStart, $lte: weekEnd } });

        const users = await User.find({ role: { $in: ['team_member', 'team_leader'] } });
        const projects = await Project.find({ isArchived: false });

        if (users.length === 0 || projects.length === 0) {
            console.log('No users or projects found. Run init-system.js first.');
            process.exit(1);
        }

        for (const user of users) {
            // Find a project the user is part of, or just any project for mock data
            let userProject = projects.find(p => p.members.includes(user._id) || p.teamLeads.includes(user._id) || p.owner.equals(user._id));
            if (!userProject) userProject = projects[0];

            // Find or create a task for this project
            let tasks = await Task.find({ project: userProject._id });
            if (tasks.length === 0) {
                tasks = [await Task.create({
                    title: 'General Maintenance',
                    project: userProject._id,
                    assignedTo: user._id,
                    status: 'In Progress'
                })];
            }

            const entries = [];
            const dailyHours = {
                0: [8.5, 'Feature Development'], // Mon
                1: [8.0, 'Bug Fixing'],          // Tue
                2: [9.0, 'Code Review'],         // Wed
                3: [8.5, 'Deployment Setup'],    // Thu
                4: [7.5, 'Documentation'],       // Fri
                5: [2.0, 'Emergency Patch'],     // Sat
                6: [0.0, 'Weekend']              // Sun
            };

            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);

                const [hours, desc] = dailyHours[i];
                if (hours > 0) {
                    const task = tasks[Math.floor(Math.random() * tasks.length)];

                    const startTime = new Date(date);
                    startTime.setHours(9, 0, 0, 0);
                    const endTime = new Date(startTime);
                    endTime.setMilliseconds(hours * 60 * 60 * 1000);

                    const log = await TimeLog.create({
                        user: user._id,
                        project: userProject._id,
                        task: task._id,
                        date: date,
                        startTime: startTime,
                        endTime: endTime,
                        duration: hours,
                        description: desc,
                        isManual: true
                    });
                    entries.push(log._id);
                }
            }

            // Create Timesheet
            const totalHours = Object.values(dailyHours).reduce((sum, h) => sum + h[0], 0);
            await Timesheet.create({
                user: user._id,
                weekStartDate: weekStart,
                weekEndDate: weekEnd,
                entries: entries,
                totalHours: totalHours,
                status: 'submitted',
                submittedAt: new Date()
            });

            console.log(`Seeded timesheet for ${user.name} (${user.role})`);
        }

        console.log('Mock Timesheet Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding timesheets:', error);
        process.exit(1);
    }
};

seedMockTimesheets();
