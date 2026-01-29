const express = require('express');
const router = express.Router();
const {
    getProjects,
    getProject,
    createProject,
    updateProject,
    archiveProject,
    addMemberToProject,
    deleteProject,
    updateProjectManagers
} = require('../controllers/projectController');

const {
    getMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone
} = require('../controllers/milestoneController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Project CRUD
router.get('/', getProjects);
router.get('/:id', getProject);

// Strict: PM or above can create projects
// Strict Rule: Projects created by System Seed/Import logic mostly. 
// We restrict UI creation for SuperAdmin/PA as per new rules.
// Keeping it technically available for future system-admin roles or specific scripts if needed, 
// but removing 'super_admin' and 'project_admin' implies they can't do it via API.
router.post('/', authorize('system_admin'), createProject);
router.put('/:id', authorize('super_admin', 'project_manager'), updateProject);
router.put('/:id/managers', authorize('super_admin', 'project_admin'), updateProjectManagers);
router.patch('/:id/archive', authorize('super_admin', 'project_manager'), archiveProject);
router.delete('/:id', authorize('super_admin'), deleteProject); // Only super admin can delete

// Strict: TL or above can add team members
// Strict: PA can add PMs, TL or above can add team members
router.post('/:id/members', authorize('super_admin', 'project_admin', 'project_manager', 'team_leader'), addMemberToProject);

// Milestones
router.get('/:projectId/milestones', getMilestones);
router.post('/:projectId/milestones', authorize('super_admin', 'project_admin', 'project_manager'), createMilestone);

// Standalone Milestone operations
router.put('/milestones/:id', authorize('super_admin', 'project_admin', 'project_manager'), updateMilestone);
router.delete('/milestones/:id', authorize('super_admin', 'project_admin', 'project_manager'), deleteMilestone);

module.exports = router;
