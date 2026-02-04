const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getGlobalStats,
    getProjectProgress,
    getProjectActivity,
    getLoginActivity,
    getProjectPDF,
    getProjectCSV,
    getProjectTimesheets
} = require('../controllers/analyticsController');

router.use(protect);

// Global view
router.get('/global', getGlobalStats);

// Project specific views
// Project specific views
router.get('/project/:projectId/progress', authorize('super_admin', 'project_admin', 'project_manager', 'team_leader', 'team_member', 'client'), getProjectProgress); // All members
router.get('/project/:projectId/activity', authorize('super_admin', 'project_admin', 'project_manager', 'team_leader'), getProjectActivity);
router.get('/project/:projectId/timesheets', authorize('super_admin', 'project_admin', 'project_manager', 'team_leader'), getProjectTimesheets);
router.get('/project/:projectId/pdf', authorize('super_admin', 'project_admin', 'project_manager', 'team_leader'), getProjectPDF);
router.get('/project/:projectId/csv', authorize('super_admin', 'project_admin', 'project_manager', 'team_leader'), getProjectCSV);

// Admin only views
router.get('/login-activity', authorize('super_admin'), getLoginActivity);

module.exports = router;
