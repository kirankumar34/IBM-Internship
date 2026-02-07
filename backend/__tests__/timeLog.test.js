/**
 * TIMELOG MODEL TESTS
 * 
 * Tests for time tracking functionality
 */

const TimeLog = require('../models/timeLogModel');

describe('TimeLog Model', () => {
    let testUser, testProject, testTask;

    beforeEach(async () => {
        testUser = await global.createTestUser();
        testProject = await global.createTestProject(testUser._id);
        testTask = await global.createTestTask(testProject._id, testUser._id);
    });

    describe('TimeLog Creation', () => {
        it('should create a time log entry', async () => {
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // 4 hours later

            const timeLog = await TimeLog.create({
                user: testUser._id,
                task: testTask._id,
                project: testProject._id,
                date: new Date(),
                startTime: startTime,
                endTime: endTime,
                duration: 4,
                description: 'Worked on feature implementation'
            });

            expect(timeLog._id).toBeDefined();
            expect(timeLog.duration).toBe(4);
            expect(timeLog.user.toString()).toBe(testUser._id.toString());
        });

        it('should allow fractional hours', async () => {
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hours later

            const timeLog = await TimeLog.create({
                user: testUser._id,
                task: testTask._id,
                project: testProject._id,
                date: new Date(),
                startTime: startTime,
                endTime: endTime,
                duration: 2.5
            });

            expect(timeLog.duration).toBe(2.5);
        });
    });

    describe('TimeLog Aggregation', () => {
        it('should calculate total hours for a user', async () => {
            await TimeLog.create({
                user: testUser._id,
                task: testTask._id,
                project: testProject._id,
                date: new Date(),
                startTime: new Date(),
                endTime: new Date(Date.now() + 3 * 3600000),
                duration: 3
            });

            await TimeLog.create({
                user: testUser._id,
                task: testTask._id,
                project: testProject._id,
                date: new Date(),
                startTime: new Date(),
                endTime: new Date(Date.now() + 5 * 3600000),
                duration: 5
            });

            const result = await TimeLog.aggregate([
                { $match: { user: testUser._id } },
                { $group: { _id: null, totalHours: { $sum: '$duration' } } }
            ]);

            expect(result[0].totalHours).toBe(8);
        });

        it('should calculate hours per project', async () => {
            const project2 = await global.createTestProject(testUser._id, {
                name: 'Second Project'
            });
            const task2 = await global.createTestTask(project2._id, testUser._id);

            await TimeLog.create({
                user: testUser._id,
                task: testTask._id,
                project: testProject._id,
                date: new Date(),
                startTime: new Date(),
                endTime: new Date(Date.now() + 4 * 3600000),
                duration: 4
            });

            await TimeLog.create({
                user: testUser._id,
                task: task2._id,
                project: project2._id,
                date: new Date(),
                startTime: new Date(),
                endTime: new Date(Date.now() + 6 * 3600000),
                duration: 6
            });

            const result = await TimeLog.aggregate([
                { $match: { user: testUser._id } },
                { $group: { _id: '$project', totalHours: { $sum: '$duration' } } }
            ]);

            // Ensure sorting to match expectations or check existence
            // The order might vary, so we check using find/filter or specific expectations
            expect(result.length).toBe(2);
            const p1 = result.find(r => r._id.toString() === testProject._id.toString());
            const p2 = result.find(r => r._id.toString() === project2._id.toString());

            expect(p1.totalHours).toBe(4);
            expect(p2.totalHours).toBe(6);
        });
    });

    describe('TimeLog Date Filtering', () => {
        it('should filter by date range', async () => {
            const today = new Date();
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);

            await TimeLog.create({
                user: testUser._id,
                task: testTask._id,
                project: testProject._id,
                date: today,
                startTime: today,
                endTime: new Date(today.getTime() + 3 * 3600000),
                duration: 3
            });

            await TimeLog.create({
                user: testUser._id,
                task: testTask._id,
                project: testProject._id,
                date: lastWeek,
                startTime: lastWeek,
                endTime: new Date(lastWeek.getTime() + 5 * 3600000),
                duration: 5
            });

            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - 3);

            const recentLogs = await TimeLog.find({
                date: { $gte: startOfWeek }
            });

            expect(recentLogs.length).toBe(1);
            expect(recentLogs[0].duration).toBe(3);
        });
    });
});
