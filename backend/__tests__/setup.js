/**
 * TEST SETUP FILE
 * 
 * Configures MongoDB Memory Server for isolated testing
 * and provides global test utilities.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Connect to in-memory database before all tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

// Clear all collections after each test
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Disconnect and stop MongoDB after all tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// Global test utilities
global.createTestUser = async (overrides = {}) => {
    const User = require('../models/userModel');

    const timestamp = Date.now();

    return await User.create({
        name: 'Test User',
        loginId: `testuser${timestamp}`,
        email: `test${timestamp}@example.com`,
        password: 'Test@123',  // Will be auto-hashed by pre-save hook
        role: 'team_member',
        approvalStatus: 'approved',
        ...overrides
    });
};

global.createTestProject = async (ownerId, overrides = {}) => {
    const Project = require('../models/projectModel');

    return await Project.create({
        name: 'Test Project',
        description: 'A test project',
        owner: ownerId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'Active',
        ...overrides
    });
};

global.createTestTask = async (projectId, createdById, overrides = {}) => {
    const Task = require('../models/taskModel');

    return await Task.create({
        title: 'Test Task',
        description: 'A test task',
        project: projectId,
        createdBy: createdById,
        status: 'To Do',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ...overrides
    });
};
