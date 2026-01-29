const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/project_mgmt_app';

async function testConnection() {
    try {
        await mongoose.connect(uri);
        console.log('Successfully connected to MongoDB');

        // Try to query projects
        const Project = require('./models/projectModel');
        const projects = await Project.find({});
        console.log(`Found ${projects.length} projects`);

        process.exit(0);
    } catch (error) {
        console.error('Connection Failed:', error);
        process.exit(1);
    }
}

testConnection();
