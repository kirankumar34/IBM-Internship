const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/fileModel');
const Task = require('../models/taskModel');
const Project = require('../models/projectModel');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp_randomstring_originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        // Add file type restrictions if needed
        cb(null, true);
    }
});

// @desc    Upload file to task or project
// @route   POST /api/files/upload
// @access  Private (project members)
const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    const { taskId, projectId, description } = req.body;

    // RBAC: Block Team Members and Clients from uploading
    if (['team_member', 'client'].includes(req.user.role)) {
        // Remove uploaded file if authorized check fails to prevent clutter
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(403);
        throw new Error('Not authorized to upload files. Only Managers and Leads can upload.');
    }

    // Must specify either taskId or projectId (not both)
    if ((taskId && projectId) || (!taskId && !projectId)) {
        res.status(400);
        throw new Error('Must specify either taskId or projectId');
    }

    // Verify access to task or project
    if (taskId) {
        const task = await Task.findById(taskId);
        if (!task) {
            // Delete uploaded file
            fs.unlinkSync(req.file.path);
            res.status(404);
            throw new Error('Task not found');
        }
    }

    if (projectId) {
        const project = await Project.findById(projectId);
        if (!project) {
            fs.unlinkSync(req.file.path);
            res.status(404);
            throw new Error('Project not found');
        }
    }

    // Check for existing file with same original name to determine version
    const query = taskId ? { task: taskId, originalName: req.file.originalname }
        : { project: projectId, originalName: req.file.originalname };

    const existingFiles = await File.find(query).sort({ version: -1 });
    const version = existingFiles.length > 0 ? existingFiles[0].version + 1 : 1;

    const fileRecord = await File.create({
        uploader: req.user.id,
        task: taskId || null,
        project: projectId || null,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        version,
        description: description || ''
    });

    await fileRecord.populate('uploader', 'name email');

    res.status(201).json(fileRecord);
});

// @desc    Get files for a task
// @route   GET /api/files/task/:taskId
// @access  Private (project members)
const getTaskFiles = asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    const files = await File.find({ task: taskId })
        .populate('uploader', 'name email')
        .sort({ createdAt: -1 });

    res.json(files);
});

// @desc    Get files for a project
// @route   GET /api/files/project/:projectId
// @access  Private (project members)
const getProjectFiles = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
        res.status(404);
        throw new Error('Project not found');
    }

    const files = await File.find({ project: projectId })
        .populate('uploader', 'name email')
        .sort({ createdAt: -1 });

    res.json(files);
});

// @desc    Download file
// @route   GET /api/files/:id/download
// @access  Private (project members)
const downloadFile = asyncHandler(async (req, res) => {
    const file = await File.findById(req.params.id);

    if (!file) {
        res.status(404);
        throw new Error('File not found');
    }

    const filePath = path.join(__dirname, '../uploads', file.filename);

    if (!fs.existsSync(filePath)) {
        res.status(404);
        throw new Error('File not found on server');
    }

    res.download(filePath, file.originalName);
});

// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private (uploader or super_admin)
const deleteFile = asyncHandler(async (req, res) => {
    const file = await File.findById(req.params.id);

    if (!file) {
        res.status(404);
        throw new Error('File not found');
    }

    // Only uploader or super admin can delete
    if (file.uploader.toString() !== req.user.id && req.user.role !== 'super_admin') {
        res.status(403);
        throw new Error('Not authorized to delete this file');
    }

    // Delete physical file
    const filePath = path.join(__dirname, '../uploads', file.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    await file.deleteOne();
    res.json({ id: req.params.id });
});

router.post('/upload', upload.single('file'), uploadFile);
router.get('/task/:taskId', getTaskFiles);
router.get('/project/:projectId', getProjectFiles);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

module.exports = router;
