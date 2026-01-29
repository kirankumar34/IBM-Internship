const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('./models/userModel');
const Project = require('./models/projectModel');
const Organization = require('./models/organizationModel');
const Task = require('./models/taskModel');
const Milestone = require('./models/milestoneModel');
const Issue = require('./models/issueModel');
const Template = require('./models/templateModel');
const Activity = require('./models/activityModel');
const Team = require('./models/teamModel');

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

const importData = async () => {
    try {
        await mongooseConnect();

        // 1. Clear Data
        await User.deleteMany();
        await Project.deleteMany();
        await Organization.deleteMany();
        await Task.deleteMany();
        await Milestone.deleteMany();
        await Issue.deleteMany();
        await Template.deleteMany();
        await Activity.deleteMany();
        await Team.deleteMany();
        console.log('Data Destroyed...'.red.inverse);

        // 2. Create Organization
        const org = await Organization.create({
            name: "Dataset Organization",
            status: "active"
        });

        // 3. Create Users from Excel
        const XLSX = require('xlsx');
        const path = require('path');
        const excelPath = path.join(__dirname, '..', 'Dummy_Employee_Data_150_Rebalanced.xlsx');

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
                const name = row["Employee's Name"];
                const roleStr = row["Employee's Role"];
                const loginId = row['Login ID'];
                const rawPassword = row['Password'];

                // Construct a fake email if not present, or use loginId if it looks like email
                // Dataset loginIDs look like 'superadmin01', not emails.
                // We'll generate a dummy email based on loginID to satisfy schema validation
                const email = `${loginId}@projectmgmt.com`;

                const systemRole = roleMap[roleStr] || 'team_member'; // Default to team member if unknown

                // Check if user already exists (in case of duplicate login IDs in excel)
                const exists = users.find(u => u.loginId === loginId);
                if (!exists) {
                    const user = await User.create({
                        name,
                        email,
                        loginId,
                        password: rawPassword, // Will be hashed by pre-save
                        role: systemRole,
                        organizationId: org._id,
                        approvalStatus: 'approved', // Seeded users are approved
                        passwordHistory: [] // Initialize empty history
                    });
                    users.push(user);
                }
            }
            console.log(`Imported ${users.length} Users from Excel`.green);

            // Helper to find user by role
            const getRole = (r) => users.find(u => u.role === r) || (users.length > 0 ? users[0] : null);

            const superAdmin = getRole('super_admin');
            let projectManagers = users.filter(u => u.role === 'project_manager');
            let teamLeaders = users.filter(u => u.role === 'team_leader');
            let teamMembers = users.filter(u => u.role === 'team_member');

            // Fallback if imported data is insufficient
            if (projectManagers.length === 0) projectManagers = [users.find(u => u.role === 'project_manager') || superAdmin];
            if (teamLeaders.length === 0) teamLeaders = [superAdmin];
            if (teamMembers.length === 0) teamMembers = [superAdmin];

            // 4. Create Teams with Hierarchy
            const teamNames = ["UI/UX Team", "Backend Team", "Testing / QA Team", "DevOps Team"];
            const teams = [];

            // Assign PM to all Team Leaders (Simple hierarchy: All TLs report to first PM)
            const mainPM = projectManagers[0];

            for (let i = 0; i < teamNames.length; i++) {
                const leader = teamLeaders[i % teamLeaders.length];
                // Update Leader to report to PM
                leader.reportsTo = mainPM._id;
                await leader.save();

                // Create Team
                const team = await Team.create({
                    name: teamNames[i],
                    leader: leader._id,
                    project: null // Will update later if needed, or keeping it loose for now
                });
                teams.push(team);

                // Assign Members to this Team and Leader
                // distribute members round-robin
                const teamMemberSubset = teamMembers.filter((_, idx) => idx % teamNames.length === i);

                for (const member of teamMemberSubset) {
                    member.teamId = team._id;
                    member.reportsTo = leader._id;
                    await member.save();

                    // Add to team members array
                    team.members.push(member._id);
                }
                await team.save();
            }
            console.log('Created Teams and Assigned Hierarchy'.green);




            // REMOVING DUPLICATE END OF FILE LOGIC

        } catch (err) {
            console.error(`Error reading Excel: ${err.message}`.red);
            console.log('Falling back to default users...'.yellow);
            // Fallback
            const user1 = await User.create({ name: 'Super Admin', email: 'super@demo.com', loginId: 'superadmin', password: 'password123', role: 'super_admin', organizationId: org._id, approvalStatus: 'approved' });
            users = [user1];
        }

        // Helper to find user by role
        const getRole = (r) => users.find(u => u.role === r) || (users.length > 0 ? users[0] : null);

        const superAdmin = getRole('super_admin');
        const projectManager = getRole('project_manager');
        const teamMember = getRole('team_member');

        // 4. Create Project Template
        const webTemplate = await Template.create({
            name: "Standard Web Project",
            description: "Default structure for web development projects",
            createdBy: superAdmin._id,
            milestones: [
                { name: "Initial Planning", description: "Define requirements and stack", relativeDueDays: 7 },
                { name: "Design Phase", description: "UI/UX prototypes", relativeDueDays: 14 },
                { name: "Development Start", description: "Repository setup and core logic", relativeDueDays: 21 },
                { name: "Final Delivery", description: "Handoff and deployment", relativeDueDays: 45 }
            ],
            tasks: [
                { title: "Setup Repo", description: "Create github project", priority: "High" },
                { title: "Define Schema", description: "Design database models", priority: "Medium" }
            ]
        });
        console.log('Created Template'.green);

        // 5. Create Projects
        const p1 = await Project.create({
            name: "Cloud Platform Migration",
            description: "Migrating legacy services to AWS infrastructure.",
            status: "Active",
            priority: "High",
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            owner: projectManager._id,
            members: [teamMember._id]
        });

        const p2 = await Project.create({
            name: "Mobile App Redesign",
            description: "Modernizing the iOS and Android applications.",
            status: "On Hold",
            priority: "Medium",
            startDate: new Date(),
            endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            owner: projectManager._id,
            members: [teamMember._id]
        });

        const p3 = await Project.create({
            name: "Security Audit 2024",
            description: "Annual security assessment of all internal systems.",
            status: "Completed",
            priority: "High",
            startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            owner: superAdmin._id,
            members: [projectManager._id]
        });

        console.log('Created 3 Projects'.green);

        // 6. Create Milestones for Project 1
        await Milestone.create([
            { name: "Infrastucture Audit", description: "Check all current servers", project: p1._id, startDate: new Date(), dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), status: "Completed" },
            { name: "AWS VPC Setup", description: "Network configuration", project: p1._id, startDate: new Date(), dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), status: "Pending" },
            { name: "Database Migration", description: "Move production DB", project: p1._id, startDate: new Date(), dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), status: "Pending" }
        ]);

        // 7. Create Activities
        await Activity.create([
            { project: p1._id, user: projectManager._id, action: "Created", details: "Project initiated by manager" },
            { project: p1._id, user: teamMember._id, action: "Milestone Updated", details: 'Milestone "Infrastucture Audit" marked as Completed' },
            { project: p2._id, user: projectManager._id, action: "Status Changed", details: "Status updated to On Hold due to resource shift" }
        ]);

        console.log('Data Imported!'.green.inverse);
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
