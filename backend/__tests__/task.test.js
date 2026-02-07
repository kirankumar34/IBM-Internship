/**
 * TASK MODEL TESTS
 * 
 * Tests for task creation, validation, and deadline logic
 */

const Task = require('../models/taskModel');

describe('Task Model', () => {
    let testUser, testProject;

    beforeEach(async () => {
        testUser = await global.createTestUser();
        testProject = await global.createTestProject(testUser._id);
    });

    describe('Task Creation', () => {
        it('should create a task with valid data', async () => {
            const task = await global.createTestTask(testProject._id, testUser._id, {
                title: 'Implement Login Feature'
            });

            expect(task._id).toBeDefined();
            expect(task.title).toBe('Implement Login Feature');
            expect(task.project.toString()).toBe(testProject._id.toString());
        });

        it('should require title field', async () => {
            await expect(Task.create({
                description: 'No title task',
                project: testProject._id,
                createdBy: testUser._id
            })).rejects.toThrow();
        });

        it('should set default status to To Do', async () => {
            const task = await global.createTestTask(testProject._id, testUser._id);
            expect(task.status).toBe('To Do');
        });

        it('should accept valid priority values', async () => {
            const highPriorityTask = await global.createTestTask(testProject._id, testUser._id, {
                priority: 'High'
            });
            expect(highPriorityTask.priority).toBe('High');
        });
    });

    describe('Task Assignment', () => {
        it('should assign task to a user', async () => {
            const assignee = await global.createTestUser({ name: 'Assignee' });

            const task = await global.createTestTask(testProject._id, testUser._id, {
                assignedTo: assignee._id
            });

            expect(task.assignedTo.toString()).toBe(assignee._id.toString());
        });

        it('should populate assigned user', async () => {
            const assignee = await global.createTestUser({ name: 'John Assignee' });

            const task = await global.createTestTask(testProject._id, testUser._id, {
                assignedTo: assignee._id
            });

            const populatedTask = await Task.findById(task._id)
                .populate('assignedTo', 'name email');

            expect(populatedTask.assignedTo.name).toBe('John Assignee');
        });
    });

    describe('Task Due Dates', () => {
        it('should track overdue tasks', async () => {
            // Create an overdue task
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 5);

            await global.createTestTask(testProject._id, testUser._id, {
                dueDate: pastDate,
                status: 'In Progress'
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const overdueTasks = await Task.find({
                dueDate: { $lt: today },
                status: { $nin: ['Completed'] }
            });

            expect(overdueTasks.length).toBe(1);
        });

        it('should find tasks due within a week', async () => {
            const today = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);

            // Create tasks with different due dates
            await global.createTestTask(testProject._id, testUser._id, {
                title: 'Due Tomorrow',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });

            await global.createTestTask(testProject._id, testUser._id, {
                title: 'Due Next Month',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            const tasksThisWeek = await Task.find({
                dueDate: { $gte: today, $lt: nextWeek }
            });

            expect(tasksThisWeek.length).toBe(1);
            expect(tasksThisWeek[0].title).toBe('Due Tomorrow');
        });
    });

    describe('Task Status Workflow', () => {
        it('should transition from To Do to In Progress', async () => {
            const task = await global.createTestTask(testProject._id, testUser._id);

            task.status = 'In Progress';
            await task.save();

            const updatedTask = await Task.findById(task._id);
            expect(updatedTask.status).toBe('In Progress');
        });

        it('should mark task as Completed', async () => {
            const task = await global.createTestTask(testProject._id, testUser._id);

            task.status = 'Completed';
            await task.save();

            const completedTask = await Task.findById(task._id);
            expect(completedTask.status).toBe('Completed');
        });
    });
});
