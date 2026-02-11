require('dotenv').config();
const mongoose = require('mongoose');
const Milestone = require('./models/milestoneModel');
const Project = require('./models/projectModel');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB\n');

    const distinctProjectIds = await Milestone.distinct('project');
    const existingProjects = await Project.find({ _id: { $in: distinctProjectIds } });
    const existingProjectIds = existingProjects.map(p => p._id.toString());
    const orphanedProjectIds = distinctProjectIds.filter(id => id && !existingProjectIds.includes(id.toString()));

    console.log(`Distinct Project IDs in milestones: ${distinctProjectIds.length}`);
    console.log(`Existing Projects matching milestones: ${existingProjects.length}`);
    console.log(`Orphaned Project IDs: ${orphanedProjectIds.length}`);

    if (orphanedProjectIds.length > 0) {
        const currentProjects = await Project.find({});
        if (currentProjects.length > 0) {
            console.log(`Re-assigning milestones from ${orphanedProjectIds.length} orphaned IDs...`);

            for (let i = 0; i < orphanedProjectIds.length; i++) {
                const targetProject = currentProjects[i % currentProjects.length];
                const result = await Milestone.updateMany(
                    { project: orphanedProjectIds[i] },
                    { project: targetProject._id }
                );
                console.log(`- Mapped orphaned ID ${orphanedProjectIds[i]} to "${targetProject.name}": ${result.modifiedCount} milestones`);
            }
            console.log('Re-assignment complete.');
        }
    } else {
        console.log('All milestones are correctly linked.');
    }

    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
