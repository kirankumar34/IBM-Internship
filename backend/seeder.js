const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');
const XLSX = require('xlsx');

const User = require('./models/userModel');
const Project = require('./models/projectModel');
const Organization = require('./models/organizationModel');
const Task = require('./models/taskModel');
const Milestone = require('./models/milestoneModel');
const Issue = require('./models/issueModel');
const Template = require('./models/templateModel');
const Activity = require('./models/activityModel');
const Team = require('./models/teamModel');
const Discussion = require('./models/discussionModel');
const Comment = require('./models/commentModel');

dotenv.config();

const mongooseConnect = async () => {
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

const importData = async () => {
    try {
        await mongooseConnect();

        console.log('Clearing old data...'.red);
        await User.deleteMany();
        await Project.deleteMany();
        await Organization.deleteMany();
        await Task.deleteMany();
        await Milestone.deleteMany();
        await Issue.deleteMany();
        await Template.deleteMany();
        await Activity.deleteMany();
        await Team.deleteMany();
        await Discussion.deleteMany();
        await Comment.deleteMany();
        console.log('Data Destroyed...'.red.inverse);

        // 1. Create Organization
        const org = await Organization.create({
            name: "Enterprise Solutions Inc.",
            status: "active"
        });

        // 2. Create Users from Excel
        const excelPath = path.join(__dirname, '..', 'Dummy_Employee_Data.xlsx');
        console.log(`Reading users from: ${excelPath}`.yellow);

        let users = [];

        try {
            const workbook = XLSX.readFile(excelPath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const excelData = XLSX.utils.sheet_to_json(sheet);

            const roleMap = {
                'Super Admin': 'super_admin',
                'Project Manager': 'project_manager',
                'Team Leader': 'team_leader',
                'Team Member': 'team_member'
            };

            for (const row of excelData) {
                try {
                    const name = row["Employee's Name"] || row["Name"] || row["Employee Name"];
                    const roleStr = row["Employee's Role"] || row["Role"];
                    const loginId = row['Login ID'] || row['Login'] || row['Username'];
                    const rawPassword = row['Password'] || 'password123';

                    if (!name || !loginId) continue;

                    const email = row['Email'] || `${loginId}@demo.com`;
                    const systemRole = roleMap[roleStr] || 'team_member';

                    if (users.find(u => u.loginId === loginId)) continue;

                    const user = await User.create({
                        name,
                        email,
                        loginId,
                        password: rawPassword, // Will be hashed
                        role: systemRole,
                        organizationId: org._id,
                        approvalStatus: 'approved',
                        passwordHistory: []
                    });
                    users.push(user);
                } catch (rowError) { } // Ignore row errors
            }
            console.log(`Imported ${users.length} Users from Excel`.green);
        } catch (err) {
            console.error(`Error reading Excel: ${err.message}`.red);
        }

        // Ensure Super Admin exists
        let superAdmin = users.find(u => u.role === 'super_admin');
        if (!superAdmin) {
            console.log('Creating fallback superadmin...'.yellow);
            superAdmin = await User.create({
                name: 'Super Admin',
                email: 'super@demo.com',
                loginId: 'superadmin01', // Match user screenshot
                password: 'password123',
                role: 'super_admin',
                organizationId: org._id,
                approvalStatus: 'approved'
            });
            users.push(superAdmin);
        }

        const projectManagers = users.filter(u => u.role === 'project_manager');
        const teamLeaders = users.filter(u => u.role === 'team_leader');
        const teamMembers = users.filter(u => u.role === 'team_member');

        if (projectManagers.length === 0) projectManagers.push(superAdmin);

        // 3. Create Teams
        console.log('Creating Teams...'.yellow);
        const teamNames = ["Frontend Dev", "Backend API", "QA Testing", "DevOps", "Mobile App", "Design/UX"];
        const teams = [];

        for (let i = 0; i < teamNames.length; i++) {
            try {
                const leader = teamLeaders[i % teamLeaders.length] || superAdmin;
                const team = await Team.create({
                    name: teamNames[i],
                    leader: leader._id
                });
                teams.push(team);

                const membersToAssign = teamMembers.filter((m, idx) => idx % teamNames.length === i);
                for (const m of membersToAssign) {
                    m.teamId = team._id;
                    await m.save();
                    team.members.push(m._id);
                }
                await team.save();
            } catch (teamErr) { }
        }

        // 4. Create Projects
        const projectPool = [
            { name: "AI Analytics Dashboard", desc: "Real-time AI metrics visualization", status: "Active" },
            { name: "Cloud Migration Phase 2", desc: "Moving legacy DB to Atlas", status: "Active" },
            { name: "Customer Portal Rewrite", desc: "Next.js frontend overhaul", status: "Active" },
            { name: "Mobile App V2", desc: "Flutter cross-platform app", status: "Active" },
            { name: "Internal HR System", desc: "Employee management portal", status: "Active" },
            { name: "Payment Gateway Integration", desc: "Stripe and PayPal support", status: "Active" },
            { name: "Security Audit 2026", desc: "Q1 Security compliance", status: "Active" },
            { name: "Legacy Archive Tool", desc: "Archiving old file server", status: "On Hold" },
            { name: "Marketing Website Redesign", desc: "New branding application", status: "On Hold" },
            { name: "Chatbot Integration", desc: "Customer support bot", status: "On Hold" },
            { name: "Q4 2025 Financial Report", desc: "Automated generation tool", status: "Completed" },
            { name: "Server Upgrade", desc: "Hardware refresh", status: "Completed" },
            { name: "API Documentation", desc: "Swagger implementation", status: "Completed" },
            { name: "User Onboarding Flow", desc: "Simplified signup process", status: "Completed" },
            { name: "Inventory Management", desc: "Warehouse tracking system", status: "Completed" },
            { name: "Client Billing Module", desc: "Invoicing and payments", status: "Completed" },
            { name: "GDPR Compliance Fixes", desc: "Data privacy updates", status: "Completed" },
            { name: "SSO Implementation", desc: "Okta integration", status: "Completed" },
            { name: "Performance Optimization", desc: "Backend caching layer", status: "Completed" },
            { name: "Notification Service", desc: "Email and SMS alerts", status: "Completed" },
            { name: "Log Aggregation", desc: "ELK Stack setup", status: "Completed" },
            { name: "Backup Strategy", desc: "Disaster recovery plan", status: "Completed" },
            { name: "CRM Integration", desc: "Salesforce sync", status: "Completed" },
            { name: "Video Conferencing Tool", desc: "Internal communication", status: "Completed" }
        ];

        console.log(`Generating ${projectPool.length} Projects with Tasks, Milestones, Discussions...`.magenta);

        for (const pInfo of projectPool) {
            try {
                let startDate, endDate;
                if (pInfo.status === 'Completed') {
                    endDate = new Date();
                    endDate.setDate(endDate.getDate() - Math.floor(Math.random() * 30));
                    startDate = new Date(endDate);
                    startDate.setDate(startDate.getDate() - 60 - Math.floor(Math.random() * 60));
                } else if (pInfo.status === 'Active') {
                    startDate = new Date();
                    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
                    endDate = new Date();
                    endDate.setDate(endDate.getDate() + 30 + Math.floor(Math.random() * 90));
                } else {
                    startDate = new Date();
                    startDate.setDate(startDate.getDate() - 60);
                    endDate = new Date();
                    endDate.setDate(endDate.getDate() + 60);
                }

                const owner = projectManagers[Math.floor(Math.random() * projectManagers.length)] || superAdmin;
                const projectMembers = [];
                const memberCount = 4 + Math.floor(Math.random() * 5); // 4-9 members
                for (let k = 0; k < memberCount; k++) {
                    const m = teamMembers[Math.floor(Math.random() * teamMembers.length)];
                    if (m && !projectMembers.includes(m._id)) projectMembers.push(m._id);
                }

                const project = await Project.create({
                    name: pInfo.name,
                    description: pInfo.desc,
                    status: pInfo.status,
                    priority: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
                    startDate,
                    endDate,
                    owner: owner._id,
                    members: projectMembers
                });

                // Milestones (3-5)
                const milestoneCount = 3 + Math.floor(Math.random() * 3);
                for (let m = 0; m < milestoneCount; m++) {
                    const mStatus = pInfo.status === 'Completed' ? 'Completed' : (Math.random() > 0.4 ? 'Completed' : 'Pending');
                    await Milestone.create({
                        name: `Phase ${m + 1}: Milestone`,
                        project: project._id,
                        description: "Key deliverables for this phase",
                        startDate: startDate,
                        dueDate: new Date(startDate.getTime() + (m + 1) * 15 * 24 * 60 * 60 * 1000),
                        status: mStatus
                    });
                }

                // Discussions (5-8)
                const discussionCount = 5 + Math.floor(Math.random() * 4);
                const topics = ["API Schema", "UI Design Review", "Deployment Strategy", "Bug Reports", "Feature Request", "Client Feedback"];
                for (let d = 0; d < discussionCount; d++) {
                    const author = projectMembers[Math.floor(Math.random() * projectMembers.length)] || owner._id;
                    const disc = await Discussion.create({
                        project: project._id,
                        createdBy: author,
                        title: `${topics[d % topics.length]} - Discussion`,
                        description: "Let's discuss the requirements and implementation details.",
                        isPinned: Math.random() > 0.9,
                        replies: []
                    });

                    // Replies
                    const replyCount = Math.floor(Math.random() * 5);
                    for (let r = 0; r < replyCount; r++) {
                        const replier = projectMembers[Math.floor(Math.random() * projectMembers.length)] || owner._id;
                        disc.replies.push({
                            user: replier,
                            content: "I agree with this point. Let's proceed.",
                            createdAt: new Date()
                        });
                    }
                    await disc.save();
                }

                // Tasks (15-25)
                const taskCount = 15 + Math.floor(Math.random() * 11); // 15-25 tasks
                const taskStatuses = ['To Do', 'In Progress', 'Blocked', 'Completed'];
                const taskPriorities = ['Low', 'Medium', 'High', 'Critical'];

                for (let t = 0; t < taskCount; t++) {
                    const tStatus = pInfo.status === 'Completed' ? 'Completed' : taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
                    const assignee = projectMembers[Math.floor(Math.random() * projectMembers.length)] || owner._id;

                    const task = await Task.create({
                        title: `Task ${t + 1}: Implement feature`,
                        description: "Detailed description of the task requirements.",
                        project: project._id,
                        assignedTo: assignee,
                        createdBy: owner._id, // FIXED: Added createdBy
                        status: tStatus,
                        priority: taskPriorities[Math.floor(Math.random() * taskPriorities.length)],
                        dueDate: endDate,
                        startDate: startDate
                    });

                    // Subtasks (30% chance)
                    if (Math.random() > 0.7) {
                        const subCount = 1 + Math.floor(Math.random() * 3);
                        for (let s = 0; s < subCount; s++) {
                            await Task.create({
                                title: `Subtask ${s + 1} of Task ${t + 1}`,
                                description: "Breakdown of the main task.",
                                project: project._id,
                                assignedTo: assignee,
                                createdBy: owner._id,
                                status: tStatus === 'Completed' ? 'Completed' : 'To Do',
                                priority: "Low",
                                dueDate: endDate,
                                parentTask: task._id
                            });
                        }
                    }

                    // Comments (50% chance)
                    if (Math.random() > 0.5) {
                        const commentAuthor = projectMembers[Math.floor(Math.random() * projectMembers.length)] || owner._id;
                        await Comment.create({
                            user: commentAuthor,
                            task: task._id,
                            content: "Update on progress: 50% done."
                        });
                    }
                }

                // Activity Logs
                await Activity.create({ project: project._id, user: owner._id, action: "Created", details: "Project initiated" });

            } catch (projErr) {
                console.error(`Error creating project ${pInfo.name}: ${projErr.message}`.red);
            }
        }

        console.log('Projects, Milestones, Tasks, Subtasks, Discussions Generated!'.green.inverse);
        process.exit();

    } catch (error) {
        console.error(`${error}`.red.inverse);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await mongooseConnect();
        await User.deleteMany();
        await Project.deleteMany();
        await Organization.deleteMany();
        await Task.deleteMany();
        await Milestone.deleteMany();
        await Issue.deleteMany();
        await Template.deleteMany();
        await Activity.deleteMany();
        await Team.deleteMany();
        await Discussion.deleteMany();
        await Comment.deleteMany();
        console.log('Data Destroyed!'.red.inverse);
        process.exit();
    } catch (error) {
        console.error(`${error}`.red.inverse);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
