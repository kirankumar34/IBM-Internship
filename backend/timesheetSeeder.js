const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('./models/userModel');
const Project = require('./models/projectModel');
const Task = require('./models/taskModel');
const TimeLog = require('./models/timeLogModel');
const Timesheet = require('./models/timesheetModel');
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

const generateTimeLogs = async () => {
    try {
        await mongooseConnect();

        console.log('--- STARTING TIMESHEET SEEDER ---'.yellow.bold);

        // 1. Get Organization
        const org = await Organization.findOne({ name: "DWISON Technologies Pvt Ltd" });
        if (!org) {
            console.error('Organization not found. Run companySeeder.js first.'.red);
            process.exit(1);
        }

        // 2. Define Specific Users to Mock
        const mockUsers = [
            { name: 'Rahul Mehta', role: 'team_member', spec: 'Frontend Developer' },
            { name: 'Sneha Iyer', role: 'team_member', spec: 'UI Designer' },
            { name: 'Arjun Rao', role: 'team_member', spec: 'Backend Engineer' },
            { name: 'Pooja Nair', role: 'team_member', spec: 'QA Engineer' },
            { name: 'Suresh Patel', role: 'project_manager', spec: 'Manager' }, // Approver
            { name: 'Anjali Sharma', role: 'team_leader', spec: 'Team Lead' } // Approver
        ];

        const dbUsers = {};

        // Find or Create these users
        for (const u of mockUsers) {
            let user = await User.findOne({ name: u.name });
            if (!user) {
                user = await User.create({
                    name: u.name,
                    email: `${u.name.toLowerCase().replace(' ', '.')}@dwisontech.com`,
                    loginId: u.name.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 100),
                    password: 'password123',
                    role: u.role,
                    specialization: u.spec,
                    organizationId: org._id,
                    approvalStatus: 'approved'
                });
                console.log(`Created User: ${user.name}`.green);
            }
            dbUsers[u.name] = user;
        }

        // Establish rudimentary hierarchy if needed (Members reporting to TL/PM)
        for (const name of ['Rahul Mehta', 'Sneha Iyer', 'Arjun Rao', 'Pooja Nair']) {
            if (dbUsers[name].reportsTo === null) {
                dbUsers[name].reportsTo = dbUsers['Anjali Sharma']._id;
                await dbUsers[name].save();
            }
        }
        dbUsers['Anjali Sharma'].reportsTo = dbUsers['Suresh Patel']._id;
        await dbUsers['Anjali Sharma'].save();


        // 3. Define Project & Tasks
        const mockProjectData = {
            name: 'DWISON Internal Portal',
            desc: 'Internal HR and Operations portal',
            tasks: [
                'UI Wireframe Design',
                'API Integration',
                'Login Module Testing',
                'Dashboard UI Fixes',
                'Database Optimization',
                'Client Feedback Implementation'
            ]
        };

        let project = await Project.findOne({ name: mockProjectData.name });
        if (!project) {
            project = await Project.create({
                name: mockProjectData.name,
                description: mockProjectData.desc,
                status: 'Active',
                priority: 'High',
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-06-30'),
                owner: dbUsers['Suresh Patel']._id,
                teamLeads: [dbUsers['Anjali Sharma']._id],
                members: [dbUsers['Rahul Mehta']._id, dbUsers['Sneha Iyer']._id, dbUsers['Arjun Rao']._id, dbUsers['Pooja Nair']._id]
            });
            console.log(`Created Project: ${project.name}`.green);
        }

        // Create/Find Tasks
        const dbTasks = {};
        for (const tName of mockProjectData.tasks) {
            let task = await Task.findOne({ title: tName, project: project._id });
            if (!task) {
                task = await Task.create({
                    title: tName,
                    description: `Task for ${tName}`,
                    project: project._id,
                    assignedTo: dbUsers['Rahul Mehta']._id, // Default assignee, will overlap in logs
                    createdBy: dbUsers['Suresh Patel']._id,
                    status: 'In Progress',
                    priority: 'Medium',
                    startDate: new Date('2026-01-15'),
                    dueDate: new Date('2026-03-01')
                });
            }
            dbTasks[tName] = task;
        }

        // 4. Generate Weekly Timesheet Data (Week: Jan 26 - Feb 01, 2026)
        console.log('Generating Weekly Logs (Jan 26 - Feb 01 2026)...'.yellow);

        const weekStart = new Date('2026-01-26T00:00:00.000Z'); // Monday
        const weekDays = 7;

        // Members to generate logs for
        const members = [dbUsers['Rahul Mehta'], dbUsers['Sneha Iyer'], dbUsers['Arjun Rao'], dbUsers['Pooja Nair']];

        // Task assignment logic (simple mapping for variety)
        const userTasks = {
            'Rahul Mehta': ['Dashboard UI Fixes', 'Client Feedback Implementation'],
            'Sneha Iyer': ['UI Wireframe Design', 'Dashboard UI Fixes'],
            'Arjun Rao': ['API Integration', 'Database Optimization'],
            'Pooja Nair': ['Login Module Testing', 'Client Feedback Implementation']
        };

        for (const user of members) {
            let weeklyTotal = 0;

            for (let i = 0; i < weekDays; i++) {
                const currentDay = new Date(weekStart);
                currentDay.setDate(weekStart.getDate() + i);
                const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'short' });

                // Skip Sunday mostly
                if (dayName === 'Sun') continue;

                // Saturday optional (50% chance of work)
                if (dayName === 'Sat' && Math.random() > 0.5) continue;

                // Hours logic
                let dailyHours = 0;
                if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(dayName)) {
                    // 6.5 to 9.0 hours
                    dailyHours = 6.5 + Math.random() * 2.5;
                } else if (dayName === 'Sat') {
                    // 0 to 4 hours
                    dailyHours = Math.random() * 4;
                }

                if (dailyHours === 0) continue;

                // Determine task
                const taskName = userTasks[user.name][i % 2];
                const task = dbTasks[taskName];

                // Create Logs (Split into 2 chunks for realism on some days?)
                // Simplify: 1 log per day per task for now, maybe 2 if long hours

                const startTime = new Date(currentDay);
                startTime.setHours(9 + Math.floor(Math.random() * 2), 0, 0, 0); // Start 9-11 AM
                const endTime = new Date(startTime.getTime() + dailyHours * 60 * 60 * 1000);

                await TimeLog.create({
                    user: user._id,
                    project: project._id,
                    task: task._id,
                    date: currentDay,
                    startTime: startTime,
                    endTime: endTime,
                    duration: Math.round(dailyHours * 10) / 10,
                    description: `Worked on ${taskName}`,
                    isManual: Math.random() > 0.3, // 30% Timer based
                    isApproved: Math.random() > 0.3, // 70% Approved
                    approvedBy: Math.random() > 0.3 ? dbUsers['Anjali Sharma']._id : null,
                    approvedAt: Math.random() > 0.3 ? new Date() : null
                });

                weeklyTotal += dailyHours;
            }
            console.log(`Generated ~${Math.round(weeklyTotal)} hrs for ${user.name} (Week 1)`);
        }


        // 5. Generate Monthly Data (February 2026)
        console.log('Generating Monthly Logs (Feb 2026)...'.yellow);

        const monthStart = new Date('2026-02-01T00:00:00.000Z');
        const monthEnd = new Date('2026-02-28T00:00:00.000Z');

        for (const user of members) {
            let currentDate = new Date(monthStart);
            let monthlyTotal = 0;

            while (currentDate <= monthEnd) {
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });

                // Skip weekends for basic load (simpler loop)
                if (dayName !== 'Sat' && dayName !== 'Sun') {
                    const dailyHours = 7.5 + (Math.random() * 1.5 - 0.5); // 7 to 8.5

                    const taskName = userTasks[user.name][currentDate.getDate() % 2];
                    const task = dbTasks[taskName];

                    const startTime = new Date(currentDate);
                    startTime.setHours(10, 0, 0, 0);
                    const endTime = new Date(startTime.getTime() + dailyHours * 60 * 60 * 1000);

                    // Status Logic: 70% Approved, 20% Pending, 10% Rejected
                    const rand = Math.random();
                    let approved = false;
                    let approver = null;
                    if (rand > 0.3) {
                        approved = true;
                        approver = dbUsers['Suresh Patel']._id;
                    }

                    await TimeLog.create({
                        user: user._id,
                        project: project._id,
                        task: task._id,
                        date: new Date(currentDate), // Clone date
                        startTime,
                        endTime,
                        duration: Math.round(dailyHours * 10) / 10,
                        description: `Development work: ${taskName}`,
                        isManual: true,
                        isApproved: approved,
                        approvedBy: approver,
                        approvedAt: approved ? new Date() : null
                    });

                    monthlyTotal += dailyHours;
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }
            console.log(`Generated ~${Math.round(monthlyTotal)} hrs for ${user.name} (Feb 2026)`);
        }

        console.log('--- TIMESHEET SEEDING COMPLETE ---'.green.bold);
        process.exit();

    } catch (error) {
        console.error(`Error: ${error.message}`.red);
        process.exit(1);
    }
};

generateTimeLogs();
