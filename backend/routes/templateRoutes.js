const express = require('express');
const router = express.Router();
const {
    getTemplates,
    createTemplate,
    deleteTemplate
} = require('../controllers/templateController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getTemplates);
router.post('/', authorize('super_admin', 'project_admin'), createTemplate);
router.delete('/:id', authorize('super_admin', 'project_admin'), deleteTemplate);

module.exports = router;
