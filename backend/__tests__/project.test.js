/**
 * PROJECT MODEL TESTS
 * 
 * Tests for project creation, validation, and relationships
 */

const Project = require('../models/projectModel');
const User = require('../models/userModel');

describe('Project Model', () => {
    let testOwner;

    beforeEach(async () => {
        testOwner = await global.createTestUser({ role: 'project_manager' });
    });

    describe('Project Creation', () => {
        it('should create a project with valid data', async () => {
            const project = await global.createTestProject(testOwner._id, {
                name: 'New Feature Development'
            });

            expect(project._id).toBeDefined();
            expect(project.name).toBe('New Feature Development');
            expect(project.owner.toString()).toBe(testOwner._id.toString());
        });

        it('should require name field', async () => {
            await expect(Project.create({
                description: 'No name project',
                owner: testOwner._id
            })).rejects.toThrow();
        });

        it('should set default status to Active', async () => {
            const project = await global.createTestProject(testOwner._id);
            expect(project.status).toBe('Active');
        });

        it('should allow isArchived flag', async () => {
            const project = await global.createTestProject(testOwner._id, {
                isArchived: true
            });
            expect(project.isArchived).toBe(true);
        });
    });

    describe('Project Relationships', () => {
        it('should populate owner details', async () => {
            const project = await global.createTestProject(testOwner._id);

            const populatedProject = await Project.findById(project._id)
                .populate('owner', 'name email');

            expect(populatedProject.owner.name).toBe(testOwner.name);
            expect(populatedProject.owner.email).toBe(testOwner.email);
        });

        it('should support multiple members', async () => {
            const member1 = await global.createTestUser({ name: 'Member 1' });
            const member2 = await global.createTestUser({ name: 'Member 2' });

            const project = await global.createTestProject(testOwner._id, {
                members: [member1._id, member2._id]
            });

            expect(project.members.length).toBe(2);
        });

        it('should support team leads array', async () => {
            const lead = await global.createTestUser({
                name: 'Team Lead',
                role: 'team_leader'
            });

            const project = await global.createTestProject(testOwner._id, {
                teamLeads: [lead._id]
            });

            expect(project.teamLeads.length).toBe(1);
        });
    });

    describe('Project Filtering', () => {
        it('should filter by isArchived status', async () => {
            await global.createTestProject(testOwner._id, { isArchived: false });
            await global.createTestProject(testOwner._id, { isArchived: true });

            const activeProjects = await Project.find({ isArchived: false });
            const archivedProjects = await Project.find({ isArchived: true });

            expect(activeProjects.length).toBe(1);
            expect(archivedProjects.length).toBe(1);
        });
    });
});
