require('dotenv').config();
const mongoose = require('mongoose');
const TimeLog = require('./models/timeLogModel');
const Project = require('./models/projectModel');
const Task = require('./models/taskModel');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB\n');

    const projects = await Project.find({});
    const projectIds = projects.map(p => p._id);
    console.log(`Total projects: ${projects.length}`);

    // Check time logs for these projects
    const timeLogs = await TimeLog.find({
        project: { $in: projectIds }
    });
    console.log(`TimeLogs for these projects: ${timeLogs.length}`);

    const approvedLogs = timeLogs.filter(l => l.isApproved);
    console.log(`Approved logs for these projects: ${approvedLogs.length}`);

    const totalHours = approvedLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    console.log(`Calculated Total Hours: ${totalHours}`);

    // Check dates of these logs
    if (approvedLogs.length > 0) {
        const dates = approvedLogs.map(l => new Date(l.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        console.log(`Logs date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);

        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
        console.log(`Eight weeks ago threshold: ${eightWeeksAgo.toISOString().split('T')[0]}`);

        const recentLogs = approvedLogs.filter(log => new Date(log.date) >= eightWeeksAgo);
        console.log(`Recent logs (last 8 weeks): ${recentLogs.length}`);
    }

    // Check if TimeLog model uses 'duration' or 'hours'
    const schema = TimeLog.schema.obj;
    console.log('\nTimeLog Schema fields:', Object.keys(schema));

    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
