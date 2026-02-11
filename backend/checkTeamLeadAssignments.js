require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel');
const Team = require('./models/teamModel');
const Project = require('./models/projectModel');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB\n');

    // Find Sanjay Kumar (tl01)
    const teamLead = await User.findOne({ loginId: 'tl01' }).populate('teamId');

    if (!teamLead) {
        console.log('Team Lead not found');
        process.exit(1);
    }

    console.log(`Team Lead: ${teamLead.name} (${teamLead.loginId})`);
    console.log(`Role: ${teamLead.role}`);
    console.log(`Team ID: ${teamLead.teamId?._id || 'NOT ASSIGNED'}`);
    console.log(`Team Name: ${teamLead.teamId?.name || 'NOT ASSIGNED'}`);

    // Find team members who report to this team lead
    const reportingMembers = await User.find({ reportsTo: teamLead._id });
    console.log(`\nTeam members reporting to ${teamLead.name}: ${reportingMembers.length}`);
    reportingMembers.forEach(m => {
        console.log(`- ${m.name} (${m.loginId}) - Role: ${m.role}`);
    });

    // Find team members in the same team
    if (teamLead.teamId) {
        const teamMembers = await User.find({
            teamId: teamLead.teamId._id,
            role: 'team_member'
        });
        console.log(`\nTeam members in ${teamLead.teamId.name}: ${teamMembers.length}`);
        teamMembers.forEach(m => {
            console.log(`- ${m.name} (${m.loginId})`);
        });
    }

    // Check projects where this team lead is assigned
    const projects = await Project.find({ teamLeads: teamLead._id })
        .populate('members', 'name loginId role');

    console.log(`\nProjects where ${teamLead.name} is a team lead: ${projects.length}`);
    projects.forEach(p => {
        console.log(`\n${p.name}:`);
        console.log(`  Members: ${p.members.length}`);
        p.members.forEach(m => {
            console.log(`  - ${m.name} (${m.loginId}) - ${m.role}`);
        });
    });

    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
