const express = require('express');
const router = express.Router();
const {
    getTasks,
    createTask,
    updateTaskStatus,
    updateTask,
    deleteTask
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Task routes
router.get('/', getTasks);
router.post('/', authorize('super_admin', 'project_manager', 'team_leader'), createTask);
router.put('/:id', updateTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', authorize('super_admin', 'project_manager'), deleteTask);

module.exports = router;
