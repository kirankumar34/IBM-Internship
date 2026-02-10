const express = require('express');
const router = express.Router();
const {
    exportProjectsCSV,
    exportTasksCSV,
    exportTimesheetsCSV
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/projects/export', exportProjectsCSV);
router.get('/tasks/export', exportTasksCSV);
router.get('/timesheets/export', exportTimesheetsCSV);

module.exports = router;
