require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel');
const Team = require('./models/teamModel');
const Project = require('./models/projectModel');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB\n');

    // Find the "Security Audit 2026" project
    const project = await Project.findOne({ name: /Security Audit/i })
        .populate('owner', 'name email role')
        .populate('assistantPm', 'name email role')
        .populate({ path: 'members', select: 'name email role loginId teamId', populate: { path: 'teamId', select: 'name' } })
        .populate({ path: 'teamLeads', select: 'name email role loginId teamId', populate: { path: 'teamId', select: 'name' } });

    if (!project) {
        console.log('Project not found');
        process.exit(1);
    }

    console.log(`Project: ${project.name}`);
    console.log(`Owner: ${project.owner?.name} (${project.owner?.role})`);
    console.log(`\nTeam Leads (${project.teamLeads.length}):`);
    project.teamLeads.forEach(tl => {
        console.log(`- ${tl.name} (${tl.loginId}) - Role: ${tl.role}`);
    });

    console.log(`\nMembers (${project.members.length}):`);
    project.members.forEach(m => {
        console.log(`- ${m.name} (${m.loginId}) - Role: ${m.role}`);
    });

    console.log(`\nCombined array would have ${project.members.length + project.teamLeads.length} users`);

    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
