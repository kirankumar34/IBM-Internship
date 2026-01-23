const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('./models/userModel');
const Project = require('./models/projectModel');
const Organization = require('./models/organizationModel');
const Task = require('./models/taskModel');
const Milestone = require('./models/milestoneModel');
const Issue = require('./models/issueModel');

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

const resetAndSeed = async () => {
    try {
        await mongooseConnect();

        // 1. CLEAR ALL DATA (Safe Reset)
        await User.deleteMany();
        await Project.deleteMany();
        await Organization.deleteMany();
        await Task.deleteMany();
        await Milestone.deleteMany();
        await Issue.deleteMany();
        console.log('Database Reset Successfully!'.red.inverse);

        // 2. CREATE INITIAL STATE
        // Create Demo Org
        const org = await Organization.create({
            name: "Default Workspace",
            status: "active"
        });
        console.log(`Created Org: ${org.name}`.green);

        // 3. CREATE SUPER ADMIN (The only manual entry needed)
        const superAdmin = await User.create({
            name: 'System Admin',
            email: 'admin@system.com',
            password: 'adminpassword',
            role: 'super_admin',
            organizationId: org._id
        });
        console.log(`Super Admin Created: ${superAdmin.email}`.green.bold);

        // 4. CREATE SAMPLE HIERARCHY (Optional but good for demo)
        // PM created by Super Admin
        const pm = await User.create({
            name: 'John PM',
            email: 'pm@demo.com',
            password: 'password123',
            role: 'project_manager',
            reportsTo: superAdmin._id,
            organizationId: org._id
        });

        // TL created by PM
        const tl = await User.create({
            name: 'Sarah TL',
            email: 'tl@demo.com',
            password: 'password123',
            role: 'team_leader',
            reportsTo: pm._id,
            organizationId: org._id
        });

        // TM created by TL
        const tm = await User.create({
            name: 'Dev Mike',
            email: 'tm@demo.com',
            password: 'password123',
            role: 'team_member',
            reportsTo: tl._id,
            organizationId: org._id
        });

        // Client (Public registration or manual)
        const client = await User.create({
            name: 'Legacy Client',
            email: 'client@demo.com',
            password: 'password123',
            role: 'client',
            organizationId: org._id
        });

        console.log('Sample Hierarchy Seeded!'.green);

        // 5. SAMPLE PROJECT
        const project = await Project.create({
            name: "Cloud Infrastructure Setup",
            description: "End-to-end cloud migration and setup.",
            status: "Active",
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            owner: pm._id,
            teamLeads: [tl._id],
            members: [tm._id]
        });
        console.log(`Project Created: ${project.name}`.green);

        // 6. SAMPLE TASK
        await Task.create({
            title: "Configure VPC",
            description: "Setup network isolation and security groups.",
            project: project._id,
            assignedTo: tm._id,
            createdBy: tl._id,
            priority: "High",
            status: "In Progress"
        });
        console.log('Task Created'.green);

        process.exit();
    } catch (error) {
        console.error(`${error}`.red.inverse);
        process.exit(1);
    }
};

resetAndSeed();
