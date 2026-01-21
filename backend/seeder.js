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
        console.log('Data Destroyed...'.red.inverse);

        // 2. Create Organization
        const org = await Organization.create({
            name: "Demo Organization",
            status: "active"
        });

        // 3. Create Users
        const user1 = await User.create({ name: 'Super Admin', email: 'super@demo.com', password: 'password123', role: 'super_admin', organization: org._id });
        const user2 = await User.create({ name: 'Project Admin', email: 'admin@demo.com', password: 'password123', role: 'project_admin', organization: org._id });
        const user3 = await User.create({ name: 'Project Manager', email: 'manager@demo.com', password: 'password123', role: 'project_manager', organization: org._id });
        const user4 = await User.create({ name: 'Team Member', email: 'member@demo.com', password: 'password123', role: 'team_member', organization: org._id });
        const user5 = await User.create({ name: 'Client User', email: 'client@demo.com', password: 'password123', role: 'client', organization: org._id });

        const users = [user1, user2, user3, user4, user5];
        console.log(`Created ${users.length} Users`.green);

        // 4. Create Project Template
        const webTemplate = await Template.create({
            name: "Standard Web Project",
            description: "Default structure for web development projects",
            createdBy: user1._id,
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
            owner: user3._id,
            members: [user4._id]
        });

        const p2 = await Project.create({
            name: "Mobile App Redesign",
            description: "Modernizing the iOS and Android applications.",
            status: "On Hold",
            priority: "Medium",
            startDate: new Date(),
            endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            owner: user2._id,
            members: [user4._id, user5._id]
        });

        const p3 = await Project.create({
            name: "Security Audit 2024",
            description: "Annual security assessment of all internal systems.",
            status: "Completed",
            priority: "High",
            startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            owner: user1._id,
            members: [user3._id]
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
            { project: p1._id, user: user3._id, action: "Created", details: "Project initiated by manager" },
            { project: p1._id, user: user4._id, action: "Milestone Updated", details: 'Milestone "Infrastucture Audit" marked as Completed' },
            { project: p2._id, user: user2._id, action: "Status Changed", details: "Status updated to On Hold due to resource shift" }
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
