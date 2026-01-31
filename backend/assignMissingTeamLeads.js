const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('./models/userModel');
const Project = require('./models/projectModel');

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

const assignLeads = async () => {
    await mongooseConnect();

    try {
        // Find all Team Leaders
        const leads = await User.find({ role: 'team_leader' });
        if (leads.length === 0) {
            console.log('No Team Leaders found in system! Cannot assign leads.'.red);
            process.exit();
        }
        console.log(`Found ${leads.length} Team Leaders in the system.`.green);

        // Find Projects without Team Leaders
        // We look for projects where teamLeads array is missing or empty
        const projects = await Project.find({
            $or: [
                { teamLeads: { $exists: false } },
                { teamLeads: { $size: 0 } }
            ]
        });

        console.log(`Found ${projects.length} projects missing Team Leaders.`.yellow);

        if (projects.length === 0) {
            console.log('All active projects already have assigned Team Leaders.'.green);
            process.exit();
        }

        // Assign Leads Round-Robin
        let leadIndex = 0;
        for (const project of projects) {
            // Pick a lead
            const lead = leads[leadIndex % leads.length];

            project.teamLeads = [lead._id];

            // Optionally add a second lead if available
            if (leads.length > 2 && Math.random() > 0.7) {
                const secondLead = leads[(leadIndex + 1) % leads.length];
                project.teamLeads.push(secondLead._id);
            }

            await project.save();
            console.log(`Assigned ${lead.name} to project: ${project.name}`.cyan);

            leadIndex++;
        }

        console.log('MISSING TEAM LEADS ASSIGNED SUCCESSFULLY'.green.bold.inverse);
        process.exit();

    } catch (error) {
        console.error(`Script Error: ${error.message}`.red);
        process.exit(1);
    }
};

assignLeads();
