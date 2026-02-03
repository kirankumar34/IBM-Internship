/**
 * PRODUCTION DATA SEEDER - Using Dwison Technologies Excel Data
 * Generates realistic IT services company data for Project Management Application
 * 
 * Run: node seedProductionData.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const XLSX = require('xlsx');
const path = require('path');

dotenv.config();

// Models
const User = require('./models/userModel');
const Organization = require('./models/organizationModel');
const Team = require('./models/teamModel');
const Project = require('./models/projectModel');
const Milestone = require('./models/milestoneModel');
const Task = require('./models/taskModel');
const TimeLog = require('./models/timeLogModel');
const Timesheet = require('./models/timesheetModel');
const Notification = require('./models/notificationModel');
const Activity = require('./models/activityModel');
const Issue = require('./models/issueModel');

// ==================== LOAD EXCEL DATA ====================

const excelPath = path.join(__dirname, '..', 'Dwison_Technologies_Users.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const EXCEL_USERS = XLSX.utils.sheet_to_json(sheet);

console.log(`Loaded ${EXCEL_USERS.length} users from Excel`);

// ==================== CONFIGURATION ====================

const COMPANY_NAME = 'Dwison Technologies Pvt Ltd';

// Date helpers
const today = new Date();
const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
};
const daysFromNow = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
};

// ==================== REALISTIC DATA POOLS ====================

const DEPARTMENTS = ['Frontend', 'Backend', 'QA', 'DevOps', 'UI/UX', 'Data & Analytics'];

const PROJECTS_DATA = [
    {
        name: 'HRMS Suite',
        description: 'Comprehensive Human Resource Management System with employee lifecycle, payroll, and attendance modules',
        priority: 'High',
        daysBack: 90,
        duration: 120
    },
    {
        name: 'FinTech Dashboard',
        description: 'Real-time financial analytics dashboard for banking sector with compliance reporting',
        priority: 'High',
        daysBack: 75,
        duration: 100
    },
    {
        name: 'E-Commerce Admin Panel',
        description: 'Admin dashboard for multi-vendor e-commerce platform with inventory and order management',
        priority: 'Medium',
        daysBack: 60,
        duration: 90
    },
    {
        name: 'Healthcare Appointment System',
        description: 'Patient appointment booking and management system for hospital chain',
        priority: 'High',
        daysBack: 45,
        duration: 75
    },
    {
        name: 'Learning Management System',
        description: 'Corporate training platform with course management, assessments, and certification tracking',
        priority: 'Medium',
        daysBack: 80,
        duration: 110
    },
    {
        name: 'Inventory Management System',
        description: 'Warehouse and supply chain management solution with barcode integration',
        priority: 'Medium',
        daysBack: 55,
        duration: 85
    },
    {
        name: 'Fleet Management Portal',
        description: 'Vehicle tracking and logistics optimization platform for transport company',
        priority: 'Low',
        daysBack: 40,
        duration: 70
    },
    {
        name: 'Customer Support Ticketing',
        description: 'Multi-channel customer support system with SLA tracking and automation',
        priority: 'Medium',
        daysBack: 70,
        duration: 95
    },
    {
        name: 'Document Management System',
        description: 'Enterprise document storage, versioning, and workflow management',
        priority: 'Low',
        daysBack: 85,
        duration: 100
    },
    {
        name: 'Vendor Management Portal',
        description: 'Supplier onboarding, contract management, and procurement workflow system',
        priority: 'Medium',
        daysBack: 50,
        duration: 80
    },
    {
        name: 'Employee Self-Service Portal',
        description: 'Self-service HR portal for leave management, reimbursements, and profile updates',
        priority: 'High',
        daysBack: 35,
        duration: 60
    },
    {
        name: 'Business Intelligence Dashboard',
        description: 'Executive dashboard with KPI visualization and predictive analytics',
        priority: 'High',
        daysBack: 65,
        duration: 90
    }
];

const MILESTONE_TEMPLATES = [
    { name: 'Requirement Analysis', description: 'Stakeholder meetings, requirement documentation, and sign-off', dayOffset: 0, durationDays: 14 },
    { name: 'UI/UX Design', description: 'Wireframes, mockups, and design system creation', dayOffset: 10, durationDays: 21 },
    { name: 'Development Phase 1', description: 'Core module development and API integration', dayOffset: 25, durationDays: 35 },
    { name: 'Development Phase 2', description: 'Feature completion and optimization', dayOffset: 55, durationDays: 25 },
    { name: 'Testing & QA', description: 'Functional, regression, and performance testing', dayOffset: 75, durationDays: 20 },
    { name: 'Deployment & Go-Live', description: 'Production deployment, training, and handover', dayOffset: 90, durationDays: 15 }
];

const TASK_TEMPLATES = {
    'Requirement Analysis': [
        { title: 'Stakeholder Interviews', priority: 'High' },
        { title: 'Business Process Mapping', priority: 'High' },
        { title: 'Functional Requirements Document', priority: 'Critical' },
        { title: 'Technical Feasibility Analysis', priority: 'Medium' },
        { title: 'Requirement Sign-off Meeting', priority: 'High' }
    ],
    'UI/UX Design': [
        { title: 'User Persona Creation', priority: 'Medium' },
        { title: 'Wireframe Design – Desktop', priority: 'High' },
        { title: 'Wireframe Design – Mobile', priority: 'Medium' },
        { title: 'High-Fidelity Mockups', priority: 'High' },
        { title: 'Design System Documentation', priority: 'Medium' },
        { title: 'Prototype Development', priority: 'High' },
        { title: 'Design Review & Approval', priority: 'Critical' }
    ],
    'Development Phase 1': [
        { title: 'Project Setup & Architecture', priority: 'Critical' },
        { title: 'Database Schema Design', priority: 'High' },
        { title: 'Authentication Module', priority: 'Critical' },
        { title: 'Authorization & RBAC', priority: 'High' },
        { title: 'Core API Development', priority: 'High' },
        { title: 'Frontend Component Library', priority: 'Medium' },
        { title: 'State Management Setup', priority: 'Medium' },
        { title: 'API Integration – Module 1', priority: 'High' },
        { title: 'API Integration – Module 2', priority: 'High' },
        { title: 'Unit Test Coverage – Phase 1', priority: 'Medium' }
    ],
    'Development Phase 2': [
        { title: 'Advanced Feature Development', priority: 'High' },
        { title: 'Third-party Integrations', priority: 'Medium' },
        { title: 'File Upload & Storage', priority: 'Medium' },
        { title: 'Notification System', priority: 'Medium' },
        { title: 'Reporting Module', priority: 'High' },
        { title: 'Dashboard Analytics', priority: 'High' },
        { title: 'Performance Optimization', priority: 'Medium' },
        { title: 'Code Review & Refactoring', priority: 'Low' }
    ],
    'Testing & QA': [
        { title: 'Test Plan Documentation', priority: 'High' },
        { title: 'Functional Testing – Core Modules', priority: 'Critical' },
        { title: 'Regression Testing Suite', priority: 'High' },
        { title: 'API Testing & Validation', priority: 'High' },
        { title: 'Performance Testing', priority: 'Medium' },
        { title: 'Security Testing', priority: 'High' },
        { title: 'Cross-browser Testing', priority: 'Medium' },
        { title: 'Bug Fixes – Sprint 1', priority: 'Critical' },
        { title: 'Bug Fixes – Sprint 2', priority: 'High' },
        { title: 'UAT Preparation', priority: 'High' }
    ],
    'Deployment & Go-Live': [
        { title: 'CI/CD Pipeline Setup', priority: 'High' },
        { title: 'Staging Environment Deployment', priority: 'High' },
        { title: 'Production Environment Setup', priority: 'Critical' },
        { title: 'Database Migration Scripts', priority: 'Critical' },
        { title: 'Go-Live Checklist Verification', priority: 'High' },
        { title: 'User Training Sessions', priority: 'Medium' },
        { title: 'Documentation Handover', priority: 'Medium' },
        { title: 'Post-deployment Monitoring', priority: 'High' }
    ]
};

// ==================== HELPER FUNCTIONS ====================

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickRandomN = (arr, n) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(n, arr.length));
};
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate loginId from email (before @)
const generateLoginId = (email) => {
    return email.split('@')[0].replace(/[^a-z0-9]/gi, '');
};

// Map Excel role to DB role
const mapRole = (excelRole) => {
    const roleMap = {
        'Super Admin': 'super_admin',
        'Project Admin': 'project_admin',
        'Project Manager': 'project_manager',
        'Team Leader': 'team_leader',
        'Team Member': 'team_member',
        'Client': 'client'
    };
    return roleMap[excelRole] || 'team_member';
};

const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getWeekEnd = (weekStart) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
};

// ==================== MAIN SEEDER ====================

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_mgmt_app');
        console.log('MongoDB Connected');

        // Clear existing data
        console.log('Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Organization.deleteMany({}),
            Team.deleteMany({}),
            Project.deleteMany({}),
            Milestone.deleteMany({}),
            Task.deleteMany({}),
            TimeLog.deleteMany({}),
            Timesheet.deleteMany({}),
            Notification.deleteMany({}),
            Activity.deleteMany({}),
            Issue.deleteMany({})
        ]);

        // Create Organization
        console.log('Creating organization...');
        const org = await Organization.create({
            name: COMPANY_NAME,
            status: 'active'
        });

        // ==================== CREATE USERS FROM EXCEL ====================
        console.log('Creating users from Excel...');

        const users = {
            superAdmin: null,
            projectAdmins: [],
            projectManagers: [],
            teamLeaders: [],
            teamMembers: [],
            clients: []
        };

        const allUsers = [];

        for (const row of EXCEL_USERS) {
            const role = mapRole(row.Role);
            const loginId = generateLoginId(row.Email);

            // Pass raw password - the User model's pre('save') hook will hash it
            const user = await User.create({
                name: row.Name,
                loginId: loginId,
                email: row.Email,
                password: row.Password,  // Raw password, model will hash
                role: role,
                specialization: pickRandom(DEPARTMENTS),
                approvalStatus: 'approved',
                organizationId: org._id
            });

            allUsers.push(user);

            // Categorize users
            switch (role) {
                case 'super_admin':
                    users.superAdmin = user;
                    break;
                case 'project_admin':
                    users.projectAdmins.push(user);
                    break;
                case 'project_manager':
                    users.projectManagers.push(user);
                    break;
                case 'team_leader':
                    users.teamLeaders.push(user);
                    break;
                case 'team_member':
                    users.teamMembers.push(user);
                    break;
                case 'client':
                    users.clients.push(user);
                    break;
            }
        }

        console.log(`  Created ${allUsers.length} Users from Excel`);
        console.log(`    Super Admin: ${users.superAdmin?.name}`);
        console.log(`    Project Admins: ${users.projectAdmins.length}`);
        console.log(`    Project Managers: ${users.projectManagers.length}`);
        console.log(`    Team Leaders: ${users.teamLeaders.length}`);
        console.log(`    Team Members: ${users.teamMembers.length}`);
        console.log(`    Clients: ${users.clients.length}`);

        // ==================== CREATE TEAMS ====================
        console.log('Creating teams...');
        const teams = [];
        for (let i = 0; i < DEPARTMENTS.length; i++) {
            const dept = DEPARTMENTS[i];
            const leader = users.teamLeaders[i * 2] || users.teamLeaders[i] || users.teamLeaders[0];
            const memberPool = users.teamMembers.filter(m => m.specialization === dept);
            const teamMembers = memberPool.length > 0 ? memberPool.slice(0, randomInt(8, 15)) : pickRandomN(users.teamMembers, randomInt(8, 15));

            const team = await Team.create({
                name: `${dept} Team`,
                leader: leader._id,
                members: teamMembers.map(m => m._id)
            });
            teams.push(team);

            await User.findByIdAndUpdate(leader._id, { teamId: team._id });

            for (const member of teamMembers) {
                await User.findByIdAndUpdate(member._id, { teamId: team._id, reportsTo: leader._id });
            }
        }
        console.log(`  Created ${teams.length} Teams`);

        // ==================== CREATE PROJECTS ====================
        console.log('Creating projects...');
        const projects = [];
        const projectStatuses = ['Active', 'Active', 'Active', 'Active', 'Completed', 'Completed', 'Completed', 'On Hold', 'On Hold', 'Active', 'Active', 'Completed'];

        for (let i = 0; i < PROJECTS_DATA.length; i++) {
            const pData = PROJECTS_DATA[i];
            const pm = users.projectManagers[i % users.projectManagers.length];
            const assistantPm = users.projectManagers[(i + 1) % users.projectManagers.length];
            const projectTLs = pickRandomN(users.teamLeaders, randomInt(2, 4));
            const projectMembers = pickRandomN(users.teamMembers, randomInt(8, 15));

            const startDate = daysAgo(pData.daysBack);
            const endDate = daysFromNow(pData.duration - pData.daysBack);

            const project = await Project.create({
                name: pData.name,
                description: pData.description,
                status: projectStatuses[i],
                priority: pData.priority,
                owner: pm._id,
                assistantPm: assistantPm._id,
                teamLeads: projectTLs.map(tl => tl._id),
                members: projectMembers.map(m => m._id),
                startDate,
                endDate,
                isArchived: false
            });
            projects.push({ ...project.toObject(), teamLeads: projectTLs, members: projectMembers, pm });
        }
        console.log(`  Created ${projects.length} Projects`);

        // ==================== CREATE MILESTONES ====================
        console.log('Creating milestones...');
        const allMilestones = [];

        for (const project of projects) {
            const projectStart = new Date(project.startDate);

            for (const mTemplate of MILESTONE_TEMPLATES) {
                const milestoneStart = new Date(projectStart);
                milestoneStart.setDate(milestoneStart.getDate() + mTemplate.dayOffset);

                const milestoneDue = new Date(milestoneStart);
                milestoneDue.setDate(milestoneDue.getDate() + mTemplate.durationDays);

                let status = 'Pending';
                if (milestoneDue < today) {
                    status = Math.random() > 0.15 ? 'Completed' : 'Pending';
                }

                const milestone = await Milestone.create({
                    name: mTemplate.name,
                    description: mTemplate.description,
                    project: project._id,
                    startDate: milestoneStart,
                    dueDate: milestoneDue,
                    status
                });
                allMilestones.push({ ...milestone.toObject(), projectData: project });
            }
        }
        console.log(`  Created ${allMilestones.length} Milestones`);

        // ==================== CREATE TASKS ====================
        console.log('Creating tasks...');
        const allTasks = [];

        for (const milestone of allMilestones) {
            const taskTemplates = TASK_TEMPLATES[milestone.name] || [];
            const projectMembers = milestone.projectData.members;
            const projectTLs = milestone.projectData.teamLeads;
            const pm = milestone.projectData.pm;

            for (const tTemplate of taskTemplates) {
                const assignee = pickRandom([...projectMembers, ...projectTLs]);

                const taskStart = new Date(milestone.startDate);
                taskStart.setDate(taskStart.getDate() + randomInt(0, 5));

                const taskDue = new Date(milestone.dueDate);
                taskDue.setDate(taskDue.getDate() - randomInt(0, 3));

                let status = 'To Do';
                if (milestone.status === 'Completed') {
                    status = 'Completed';
                } else if (taskDue < today) {
                    const rand = Math.random();
                    if (rand < 0.7) status = 'Completed';
                    else if (rand < 0.85) status = 'In Progress';
                    else if (rand < 0.92) status = 'Blocked';
                    else status = 'To Do';
                } else if (taskStart < today) {
                    const rand = Math.random();
                    if (rand < 0.3) status = 'Completed';
                    else if (rand < 0.7) status = 'In Progress';
                    else if (rand < 0.8) status = 'Blocked';
                    else status = 'To Do';
                }

                const task = await Task.create({
                    title: `${tTemplate.title} – ${milestone.projectData.name.split(' ')[0]}`,
                    description: `Task for ${milestone.name} phase of ${milestone.projectData.name}`,
                    project: milestone.project,
                    assignedTo: assignee._id,
                    createdBy: pm._id,
                    priority: tTemplate.priority,
                    status,
                    blockedReason: status === 'Blocked' ? pickRandom([
                        'Waiting for API documentation',
                        'Dependency on external vendor',
                        'Infrastructure setup pending',
                        'Design approval required',
                        'Client feedback awaited'
                    ]) : '',
                    startDate: taskStart,
                    dueDate: taskDue
                });
                allTasks.push({ ...task.toObject(), assignee, project: milestone.projectData });
            }
        }
        console.log(`  Created ${allTasks.length} Tasks`);

        // ==================== CREATE ISSUES (BUGS) ====================
        console.log('Creating issues/bugs...');
        const issues = [];

        for (const project of projects) {
            const bugCount = randomInt(3, 8);
            for (let i = 0; i < bugCount; i++) {
                const reporter = pickRandom([...project.members, ...project.teamLeads]);
                const issue = await Issue.create({
                    title: pickRandom([
                        'Login session expires unexpectedly',
                        'API response timeout on large datasets',
                        'UI alignment issue on mobile view',
                        'Date picker not working in Safari',
                        'Export functionality fails for PDFs',
                        'Duplicate entries in dropdown',
                        'Form validation not triggering',
                        'Pagination breaks on last page',
                        'Filter reset not clearing values',
                        'Notification count incorrect'
                    ]) + ` – ${project.name.split(' ')[0]}`,
                    description: 'Bug identified during testing phase',
                    project: project._id,
                    reportedBy: reporter._id,
                    severity: pickRandom(['Low', 'Medium', 'High', 'Critical']),
                    status: pickRandom(['Open', 'In Progress', 'Resolved', 'Closed'])
                });
                issues.push(issue);
            }
        }
        console.log(`  Created ${issues.length} Issues`);

        // ==================== CREATE TIME LOGS & TIMESHEETS ====================
        console.log('Creating time logs and timesheets...');
        let timeLogCount = 0;
        let timesheetCount = 0;

        const workableTasks = allTasks.filter(t =>
            ['Completed', 'In Progress'].includes(t.status) && t.assignee
        );

        const tasksByUser = {};
        for (const task of workableTasks) {
            const userId = task.assignedTo.toString();
            if (!tasksByUser[userId]) {
                tasksByUser[userId] = [];
            }
            tasksByUser[userId].push(task);
        }

        const weeksToGenerate = 12;

        for (const userId in tasksByUser) {
            const userTasks = tasksByUser[userId];
            if (userTasks.length === 0) continue;

            for (let week = 0; week < weeksToGenerate; week++) {
                const weekStart = getWeekStart(daysAgo(week * 7));
                const weekEnd = getWeekEnd(weekStart);

                if (weekStart > today) continue;

                const weekLogs = [];

                for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
                    const logDate = new Date(weekStart);
                    logDate.setDate(logDate.getDate() + dayOffset);

                    if (logDate > today) continue;

                    const tasksToday = randomInt(1, 3);
                    let remainingHours = randomInt(6, 8);

                    for (let t = 0; t < tasksToday && remainingHours > 0; t++) {
                        const task = pickRandom(userTasks);
                        const hours = Math.min(randomInt(1, 4), remainingHours);
                        remainingHours -= hours;

                        const startHour = 9 + (8 - remainingHours - hours);
                        const startTime = new Date(logDate);
                        startTime.setHours(startHour, 0, 0, 0);

                        const endTime = new Date(startTime);
                        endTime.setHours(startHour + hours, 0, 0, 0);

                        const timeLog = await TimeLog.create({
                            user: userId,
                            task: task._id,
                            project: task.project._id,
                            date: logDate,
                            startTime,
                            endTime,
                            duration: hours,
                            description: `Worked on ${task.title}`,
                            isManual: true,
                            isApproved: week >= 2
                        });
                        weekLogs.push(timeLog);
                        timeLogCount++;
                    }
                }

                if (weekLogs.length > 0) {
                    const totalHours = weekLogs.reduce((sum, log) => sum + log.duration, 0);

                    let status = 'draft';
                    if (week >= 4) {
                        status = 'approved';
                    } else if (week >= 2) {
                        status = Math.random() > 0.4 ? 'approved' : 'submitted';
                    } else if (week >= 1) {
                        status = Math.random() > 0.5 ? 'submitted' : 'draft';
                    }

                    await Timesheet.create({
                        user: userId,
                        weekStartDate: weekStart,
                        weekEndDate: weekEnd,
                        entries: weekLogs.map(l => l._id),
                        totalHours,
                        status,
                        approver: status === 'approved' ? pickRandom(users.projectManagers)._id : null,
                        submittedAt: ['submitted', 'approved'].includes(status) ? new Date(weekEnd) : null,
                        approvedAt: status === 'approved' ? new Date(weekEnd) : null
                    });
                    timesheetCount++;
                }
            }
        }
        console.log(`  Created ${timeLogCount} Time Logs`);
        console.log(`  Created ${timesheetCount} Timesheets`);

        // ==================== CREATE NOTIFICATIONS ====================
        console.log('Creating notifications...');
        let notificationCount = 0;

        for (const task of allTasks.slice(0, 100)) {
            if (task.assignee) {
                await Notification.create({
                    recipient: task.assignedTo,
                    sender: task.createdBy,
                    type: 'task_assigned',
                    title: 'New Task Assigned',
                    message: `You have been assigned: ${task.title}`,
                    refModel: 'Task',
                    refId: task._id,
                    isRead: Math.random() > 0.3,
                    createdAt: task.startDate || daysAgo(randomInt(1, 30))
                });
                notificationCount++;
            }
        }

        const approvedTimesheets = await Timesheet.find({ status: 'approved' }).limit(50);
        for (const ts of approvedTimesheets) {
            await Notification.create({
                recipient: ts.user,
                sender: ts.approver,
                type: 'timesheet_approved',
                title: 'Timesheet Approved',
                message: `Your timesheet for week of ${ts.weekStartDate.toLocaleDateString()} has been approved`,
                refModel: 'Timesheet',
                refId: ts._id,
                isRead: Math.random() > 0.2,
                createdAt: ts.approvedAt || daysAgo(randomInt(1, 20))
            });
            notificationCount++;
        }

        for (const project of projects) {
            const recipients = [...project.members, ...project.teamLeads].slice(0, 5);
            for (const member of recipients) {
                await Notification.create({
                    recipient: member._id,
                    sender: project.pm._id,
                    type: 'project_update',
                    title: 'Project Update',
                    message: `${project.name} status updated to ${project.status}`,
                    refModel: 'Project',
                    refId: project._id,
                    isRead: Math.random() > 0.4,
                    createdAt: daysAgo(randomInt(1, 30))
                });
                notificationCount++;
            }
        }

        console.log(`  Created ${notificationCount} Notifications`);

        // ==================== CREATE ACTIVITY LOGS ====================
        console.log('Creating activity logs...');
        let activityCount = 0;

        for (const project of projects) {
            await Activity.create({
                project: project._id,
                user: project.pm._id,
                action: 'Project Created',
                details: `${project.name} was created`,
                createdAt: project.startDate
            });
            activityCount++;

            const projectTasks = allTasks.filter(t => t.project._id.toString() === project._id.toString());
            for (const task of projectTasks.slice(0, 10)) {
                await Activity.create({
                    project: project._id,
                    user: task.createdBy,
                    action: 'Task Created',
                    details: `Task "${task.title}" was created`,
                    createdAt: task.startDate || daysAgo(randomInt(5, 30))
                });
                activityCount++;

                if (task.status === 'Completed') {
                    await Activity.create({
                        project: project._id,
                        user: task.assignedTo,
                        action: 'Task Completed',
                        details: `Task "${task.title}" marked as completed`,
                        createdAt: daysAgo(randomInt(1, 10))
                    });
                    activityCount++;
                }
            }
        }
        console.log(`  Created ${activityCount} Activity Logs`);

        // ==================== SUMMARY ====================
        console.log('\n========== SEEDING COMPLETE ==========');
        console.log(`Organization: ${COMPANY_NAME}`);
        console.log(`Users: ${allUsers.length} (from Excel)`);
        console.log(`  - Super Admin: 1 (${users.superAdmin?.name})`);
        console.log(`  - Project Admins: ${users.projectAdmins.length}`);
        console.log(`  - Project Managers: ${users.projectManagers.length}`);
        console.log(`  - Team Leaders: ${users.teamLeaders.length}`);
        console.log(`  - Team Members: ${users.teamMembers.length}`);
        console.log(`  - Clients: ${users.clients.length}`);
        console.log(`Projects: ${projects.length}`);
        console.log(`Milestones: ${allMilestones.length}`);
        console.log(`Tasks: ${allTasks.length}`);
        console.log(`Issues: ${issues.length}`);
        console.log(`Time Logs: ${timeLogCount}`);
        console.log(`Timesheets: ${timesheetCount}`);
        console.log(`Notifications: ${notificationCount}`);
        console.log(`Activities: ${activityCount}`);
        console.log('\n--- LOGIN CREDENTIALS ---');
        console.log(`Super Admin: ${users.superAdmin?.loginId} / ${EXCEL_USERS[0].Password}`);
        console.log('All passwords are as defined in Excel file');
        console.log('=========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedDatabase();
