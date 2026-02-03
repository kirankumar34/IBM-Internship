const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getGlobalStats,
    getProjectProgress,
    getProjectActivity,
    getLoginActivity,
    getProjectPDF,
    getProjectTimesheets
} = require('../controllers/analyticsController');

router.use(protect);

// Global view
router.get('/global', getGlobalStats);

// Project specific views
router.get('/project/:projectId/progress', getProjectProgress);
router.get('/project/:projectId/activity', getProjectActivity);
router.get('/project/:projectId/timesheets', getProjectTimesheets);
router.get('/project/:projectId/pdf', getProjectPDF);

// Admin only views
router.get('/login-activity', authorize('super_admin'), getLoginActivity);

module.exports = router;
