const express = require('express');
const router = express.Router();
const {
    getProjects,
    getProject,
    createProject,
    updateProject,
    archiveProject,
    deleteProject
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
router.post('/', authorize('super_admin', 'project_admin', 'project_manager'), createProject);
router.put('/:id', authorize('super_admin', 'project_admin', 'project_manager'), updateProject);
router.patch('/:id/archive', authorize('super_admin', 'project_admin', 'project_manager'), archiveProject);
router.delete('/:id', authorize('super_admin'), deleteProject); // Only super admin can permanently delete

// Milestones within Project context
router.get('/:projectId/milestones', getMilestones);
router.post('/:projectId/milestones', authorize('super_admin', 'project_admin', 'project_manager'), createMilestone);

// Standalone Milestone operations
router.put('/milestones/:id', authorize('super_admin', 'project_admin', 'project_manager'), updateMilestone);
router.delete('/milestones/:id', authorize('super_admin', 'project_admin', 'project_manager'), deleteMilestone);

module.exports = router;
