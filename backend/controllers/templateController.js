const asyncHandler = require('express-async-handler');
const Template = require('../models/templateModel');

// @desc    Get all templates
// @route   GET /api/templates
// @access  Private
const getTemplates = asyncHandler(async (req, res) => {
    const templates = await Template.find().populate('createdBy', 'name');
    res.status(200).json(templates);
});

// @desc    Create template
// @route   POST /api/templates
// @access  Private (Admin only)
const createTemplate = asyncHandler(async (req, res) => {
    const { name, description, milestones, tasks } = req.body;

    if (!name) {
        res.status(400);
        throw new Error('Please add a template name');
    }

    const template = await Template.create({
        name,
        description,
        milestones,
        tasks,
        createdBy: req.user.id
    });

    res.status(201).json(template);
});

// @desc    Delete template
// @route   DELETE /api/templates/:id
// @access  Private (Admin only)
const deleteTemplate = asyncHandler(async (req, res) => {
    const template = await Template.findById(req.params.id);

    if (!template) {
        res.status(404);
        throw new Error('Template not found');
    }

    await template.deleteOne();
    res.status(200).json({ id: req.params.id });
});

module.exports = {
    getTemplates,
    createTemplate,
    deleteTemplate
};
