const express = require('express');
const router = express.Router();
const {
    getProjectIssues,
    createIssue,
    updateIssue,
    deleteIssue
} = require('../controllers/issueController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/project/:projectId', getProjectIssues);
router.post('/', createIssue);
router.put('/:id', updateIssue);
router.delete('/:id', deleteIssue);

module.exports = router;
