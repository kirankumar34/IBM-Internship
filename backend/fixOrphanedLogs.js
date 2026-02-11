require('dotenv').config();
const mongoose = require('mongoose');
const TimeLog = require('./models/timeLogModel');
const Project = require('./models/projectModel');
const User = require('./models/userModel');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB\n');

    const distinctProjectIds = await TimeLog.distinct('project');
    const existingProjects = await Project.find({ _id: { $in: distinctProjectIds } });
    const existingProjectIds = existingProjects.map(p => p._id.toString());
    const orphanedProjectIds = distinctProjectIds.filter(id => !existingProjectIds.includes(id.toString()));

    console.log(`Distinct Project IDs in logs: ${distinctProjectIds.length}`);
    console.log(`Existing Projects matching logs: ${existingProjects.length}`);
    console.log(`Orphaned Project IDs: ${orphanedProjectIds.length}`);

    if (orphanedProjectIds.length > 0) {
        const currentProjects = await Project.find({});
        if (currentProjects.length > 0) {
            console.log(`Re-assigning logs from ${orphanedProjectIds.length} orphaned IDs to ${currentProjects.length} existing projects...`);

            for (let i = 0; i < orphanedProjectIds.length; i++) {
                const targetProject = currentProjects[i % currentProjects.length];
                const result = await TimeLog.updateMany(
                    { project: orphanedProjectIds[i] },
                    { project: targetProject._id }
                );
                console.log(`- Mapped orphaned ID ${orphanedProjectIds[i]} to "${targetProject.name}": ${result.modifiedCount} logs`);
            }
            console.log('Re-assignment complete.');
        } else {
            console.log('Error: No current projects found to re-assign logs to.');
        }
    } else {
        console.log('All logs are correctly linked to existing projects.');
    }

    // Now let's check the date range and maybe update some logs to be "recent" so the chart has data
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const recentLogsCount = await TimeLog.countDocuments({ date: { $gte: eightWeeksAgo } });
    console.log(`\nRecent logs (last 8 weeks): ${recentLogsCount}`);

    if (recentLogsCount === 0) {
        console.log('All logs are old. Updating some logs to be recent for analytics demo...');
        const oldLogs = await TimeLog.find({}).limit(500);
        for (let i = 0; i < oldLogs.length; i++) {
            const newDate = new Date();
            newDate.setDate(newDate.getDate() - (i % 50)); // Spread over 50 days
            await TimeLog.findByIdAndUpdate(oldLogs[i]._id, { date: newDate });
        }
        console.log(`Updated ${oldLogs.length} logs to have recent dates.`);
    }

    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
