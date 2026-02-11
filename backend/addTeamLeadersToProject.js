require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel');
const Team = require('./models/teamModel');
const Project = require('./models/projectModel');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB\n');

    // Find the "Security Audit 2026" project
    const project = await Project.findOne({ name: /Security Audit/i });

    if (!project) {
        console.log('Project not found');
        process.exit(1);
    }

    console.log(`Project: ${project.name}`);
    console.log(`Current Team Leads: ${project.teamLeads.length}`);

    // Find some team leaders to add
    const teamLeaders = await User.find({ role: 'team_leader' }).limit(3);

    console.log(`\nAdding ${teamLeaders.length} team leaders to the project:`);
    teamLeaders.forEach(tl => {
        console.log(`- ${tl.name} (${tl.loginId})`);
    });

    // Add team leaders to the project
    const teamLeadIds = teamLeaders.map(tl => tl._id);
    project.teamLeads.push(...teamLeadIds);

    await project.save();

    console.log(`\n✅ Successfully added team leaders to the project!`);
    console.log(`New Team Leads count: ${project.teamLeads.length}`);

    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
