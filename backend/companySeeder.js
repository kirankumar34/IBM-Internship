const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const XLSX = require('xlsx');
const path = require('path');
const User = require('./models/userModel');
const Project = require('./models/projectModel');
const Organization = require('./models/organizationModel');
const Task = require('./models/taskModel');
const Milestone = require('./models/milestoneModel');
const Activity = require('./models/activityModel');
const Team = require('./models/teamModel');
const TimeLog = require('./models/timeLogModel');
const Timesheet = require('./models/timesheetModel');
const Comment = require('./models/commentModel');
const FileModel = require('./models/fileModel');
const LoginActivity = require('./models/loginActivityModel');

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

const PROJECT_TEMPLATES = [
    { name: 'E-Commerce Platform Revamp', desc: 'Modernizing the digital storefront for a global retail giant with headless architecture.' },
    { name: 'Healthcare Appointment System', desc: 'A unified portal for patients and doctors with real-time slot management and telemedicine integration.' },
    { name: 'FinTech Loan Processing Portal', desc: 'Automating loan workflows with AI-driven risk assessment and bank API integrations.' },
    { name: 'Mobile Banking App Redesign', desc: 'Enhancing user experience for a leading private bank with biometric security and UPI integration.' },
    { name: 'Insurance Claims Dashboard', desc: 'Centralized system for tracking and processing insurance claims with automated fraud detection.' },
    { name: 'Corporate HRMS Suite', desc: 'Internal tool for payroll, attendance, and performance tracking across multi-city offices.' },
    { name: 'Supply Chain Tracker', desc: 'Real-time logistics monitoring system with IoT integration for temperature-sensitive goods.' },
    { name: 'EdTech Learning Portal', desc: 'LMS platform for corporate training with interactive assessments and progress tracking.' }
];

const TASK_LEVELS = [
    { title: 'Requirement Gathering' },
    { title: 'Stakeholder Interviews' },
    { title: 'Wireframe Design' },
    { title: 'Style Guide Definition' },
    { title: 'High-Fidelity Mockups' },
    { title: 'Component Library Setup' },
    { title: 'API Integration' },
    { title: 'State Management Logic' },
    { title: 'Database Schema Design' },
    { title: 'Auth Middleware Implementation' },
    { title: 'Product Microservice Development' },
    { title: 'Unit Testing Setup' },
    { title: 'Integration Test Suite' },
    { title: 'UAT Feedback Cycle' },
    { title: 'CI/CD Pipeline Setup' },
    { title: 'Cloud Infrastructure Provisioning' },
    { title: 'Security Hardening' }
];

const importData = async () => {
    try {
        await mongooseConnect();

        // 1. Clear All Collections
        await Promise.all([
            User.deleteMany(),
            Project.deleteMany(),
            Organization.deleteMany(),
            Task.deleteMany(),
            Milestone.deleteMany(),
            Activity.deleteMany(),
            Team.deleteMany(),
            TimeLog.deleteMany(),
            Timesheet.deleteMany(),
            Comment.deleteMany(),
            FileModel.deleteMany(),
            LoginActivity.deleteMany()
        ]);
        console.log('Data Destroyed...'.red.inverse);

        // 2. Organization
        const org = await Organization.create({
            name: "DWISON Technologies Pvt Ltd",
            status: "active"
        });

        // 3. Load Excel Data
        const excelPath = path.join(__dirname, '..', 'Dummy_Employee_Data_150_Rebalanced.xlsx');
        const workbook = XLSX.readFile(excelPath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(sheet);

        const roleMap = {
            'Super Admin': 'super_admin',
            'Project Admin': 'project_admin',
            'Project Manager': 'project_manager',
            'Team Leader': 'team_leader',
            'Team Member': 'team_member'
        };

        const users = [];
        let superAdmin = null;
        const pms = [];
        const tls = [];
        const members = [];
        const padmins = [];

        console.log('Creating users from Excel...'.yellow);

        for (const row of excelData) {
            const name = row["Employee's Name"];
            const roleStr = row["Employee's Role"];
            const loginId = row['Login ID'];
            const password = row['Password'];
            const designation = row['Designation'];

            const systemRole = roleMap[roleStr] || 'team_member';
            const email = `${loginId}@dwisontech.com`;

            const user = await User.create({
                name,
                email,
                loginId,
                password,
                role: systemRole,
                specialization: designation,
                organizationId: org._id,
                approvalStatus: 'approved'
            });

            users.push(user);
            if (systemRole === 'super_admin') superAdmin = user;
            if (systemRole === 'project_manager') pms.push(user);
            if (systemRole === 'team_leader') tls.push(user);
            if (systemRole === 'team_member') members.push(user);
            if (systemRole === 'project_admin') padmins.push(user);
        }

        console.log(`Created ${users.length} Users from Excel`.green);

        // 4. Establish Hierarchy
        console.log('Establishing reporting lines...'.yellow);
        // Team Members report to Team Leaders
        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            const leader = tls[i % tls.length];
            member.reportsTo = leader._id;
            await member.save();
        }

        // Team Leaders report to Project Managers
        for (let i = 0; i < tls.length; i++) {
            const leader = tls[i];
            const pm = pms[i % pms.length];
            leader.reportsTo = pm._id;
            await leader.save();
        }

        // Project Managers and Admins report to Super Admin
        for (const pm of pms) {
            pm.reportsTo = superAdmin._id;
            await pm.save();
        }
        for (const pa of padmins) {
            pa.reportsTo = superAdmin._id;
            await pa.save();
        }

        // 5. Create Projects (8)
        const projects = [];
        const now = new Date();
        for (let i = 0; i < PROJECT_TEMPLATES.length; i++) {
            const template = PROJECT_TEMPLATES[i];
            const startDate = new Date();
            startDate.setDate(now.getDate() - (30 * (i + 1)));
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 90);

            const status = i < 2 ? 'Completed' : i < 6 ? 'Active' : 'On Hold';
            const priority = i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low';

            const project = await Project.create({
                name: template.name,
                description: template.desc,
                status,
                priority,
                startDate,
                endDate,
                owner: pms[i % pms.length]._id,
                assistantPm: pms[(i + 1) % pms.length]._id,
                members: members.slice(i * 10, (i + 1) * 10).map(m => m._id),
                teamLeads: tls.slice(i * 3, (i + 1) * 3).map(t => t._id)
            });
            projects.push(project);

            // 6. Milestones (5 per project)
            const milestoneTpl = ['Requirements', 'UI Design', 'API Development', 'Frontend Integration', 'Final UAT'];
            for (let j = 0; j < milestoneTpl.length; j++) {
                const isCompleted = status === 'Completed' || (status === 'Active' && j < 2);
                await Milestone.create({
                    name: milestoneTpl[j],
                    description: `Phase: ${milestoneTpl[j]}`,
                    project: project._id,
                    dueDate: new Date(startDate.getTime() + (j + 1) * 15 * 24 * 60 * 60 * 1000),
                    status: isCompleted ? 'Completed' : 'Pending'
                });
            }

            // 7. Tasks (30 per project)
            const projectMembers = [...members.slice(i * 10, (i + 1) * 10), ...tls.slice(i * 3, (i + 1) * 3)];
            for (let k = 0; k < 30; k++) {
                const taskTpl = TASK_LEVELS[k % TASK_LEVELS.length];
                const taskStatus = status === 'Completed' ? 'Completed' : (k % 4 === 0 ? 'Completed' : k % 4 === 1 ? 'In Progress' : k % 4 === 2 ? 'To Do' : 'Blocked');

                await Task.create({
                    title: `${taskTpl.title} - ${project.name}`,
                    description: `Execution for ${project.name}`,
                    project: project._id,
                    assignedTo: projectMembers[k % projectMembers.length]._id,
                    createdBy: pms[i % pms.length]._id,
                    status: taskStatus,
                    priority: k % 3 === 0 ? 'High' : 'Medium',
                    startDate: startDate,
                    dueDate: new Date(startDate.getTime() + (k + 5) * 24 * 60 * 60 * 1000)
                });
            }

            // 8. Activity
            await Activity.create({
                project: project._id,
                user: pms[i % pms.length]._id,
                action: 'Project Started',
                details: `Project "${project.name}" initialized using Excel dataset.`
            });
        }
        console.log(`Created ${projects.length} Projects with Milestones and Tasks`.green);

        // 9. Time Tracking (Module 5)
        console.log('Generating Time Tracking Data...'.yellow);
        const last14Days = [];
        for (let i = 0; i < 14; i++) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            if (d.getDay() !== 0 && d.getDay() !== 6) last14Days.push(new Date(d));
        }

        for (const tm of members.slice(0, 50)) {
            const project = projects.find(p => p.members.includes(tm._id)) || projects[0];
            const tasks = await Task.find({ project: project._id, assignedTo: tm._id });

            for (const day of last14Days) {
                if (tasks.length > 0) {
                    const task = tasks[0];
                    const duration = 7 + Math.random() * 2;
                    const startTime = new Date(day);
                    startTime.setHours(9, 0, 0, 0);
                    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

                    await TimeLog.create({
                        user: tm._id,
                        project: project._id,
                        task: task._id,
                        date: day,
                        startTime,
                        endTime,
                        duration: Math.round(duration * 10) / 10,
                        description: `Working on ${task.title}`,
                        isApproved: true,
                        approvedBy: pms[0]._id,
                        approvedAt: now
                    });
                }
            }

            const lastWeekStart = new Date(now);
            lastWeekStart.setDate(now.getDate() - 7);
            await Timesheet.create({
                user: tm._id,
                weekStartDate: lastWeekStart,
                weekEndDate: now,
                totalHours: 40 + Math.floor(Math.random() * 10),
                status: 'approved',
                approver: pms[0]._id,
                approvedAt: now
            });
        }

        // 10. Audit Logs
        console.log('Generating Global Audit Logs...'.yellow);
        for (const user of users.slice(0, 80)) {
            for (let i = 0; i < 5; i++) {
                const loginDate = new Date();
                loginDate.setDate(now.getDate() - i);
                loginDate.setHours(9, Math.floor(Math.random() * 60), 0);
                const logoutDate = new Date(loginDate);
                logoutDate.setHours(18, Math.floor(Math.random() * 60), 0);

                await LoginActivity.create({
                    user: user._id,
                    loginTime: loginDate,
                    logoutTime: logoutDate,
                    sessionDuration: (logoutDate - loginDate) / 1000,
                    isActive: false
                });
            }
        }

        // 11. Collaboration
        for (let i = 0; i < 5; i++) {
            const project = projects[i];
            await Comment.create({
                project: project._id,
                user: tls[i]._id,
                content: "Updated task specs as per client requirements.",
                isSystem: false
            });
            await FileModel.create({
                filename: `architecture_p${i}.pdf`,
                originalName: `Architecture_P${i}.pdf`,
                project: project._id,
                uploader: tls[i]._id,
                mimetype: 'application/pdf',
                size: 1024 * 1024 * 2,
                url: `/uploads/mock_file.pdf`
            });
        }

        console.log('MASTER DATA SEEDING COMPLETE FROM EXCEL!'.green.bold.inverse);
        process.exit();
    } catch (error) {
        console.error(`${error}`.red.inverse);
        process.exit(1);
    }
};

importData();
