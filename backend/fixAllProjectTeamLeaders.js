require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel');
const Team = require('./models/teamModel');
const Project = require('./models/projectModel');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB\n');

    // Find all projects
    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects\n`);

    // Get all team leaders
    const allTeamLeaders = await User.find({ role: 'team_leader' });
    console.log(`Available Team Leaders: ${allTeamLeaders.length}\n`);

    let fixedCount = 0;

    for (const project of projects) {
        const currentLeadCount = project.teamLeads.length;

        if (currentLeadCount === 0) {
            console.log(`❌ ${project.name} - NO team leaders`);

            // Assign 2-3 random team leaders to each project
            const numToAssign = Math.floor(Math.random() * 2) + 2; // 2 or 3
            const shuffled = [...allTeamLeaders].sort(() => 0.5 - Math.random());
            const selectedLeaders = shuffled.slice(0, numToAssign);

            project.teamLeads = selectedLeaders.map(tl => tl._id);
            await project.save();

            console.log(`   ✅ Added ${numToAssign} team leaders: ${selectedLeaders.map(tl => tl.name).join(', ')}`);
            fixedCount++;
        } else {
            console.log(`✅ ${project.name} - ${currentLeadCount} team leaders already assigned`);
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total projects: ${projects.length}`);
    console.log(`   Projects fixed: ${fixedCount}`);
    console.log(`   Projects already OK: ${projects.length - fixedCount}`);

    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
