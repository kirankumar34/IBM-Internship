const mongoose = require('mongoose');

const fileSchema = mongoose.Schema({
    uploader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Polymorphic: can be attached to task OR project
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        index: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        index: true
    },
    filename: {
        type: String,
        required: true // Unique generated filename for storage
    },
    originalName: {
        type: String,
        required: true // Original filename from upload
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number, // File size in bytes
        required: true
    },
    url: {
        type: String, // Relative or absolute path to file
        required: true
    },
    version: {
        type: Number,
        default: 1
    },
    description: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Validation: file must be attached to either task or project
fileSchema.pre('save', function (next) {
    const hasTask = this.task != null;
    const hasProject = this.project != null;

    if (hasTask && hasProject) {
        next(new Error('File cannot be attached to both task and project'));
    } else if (!hasTask && !hasProject) {
        next(new Error('File must be attached to either task or project'));
    } else {
        next();
    }
});

// Compound indexes for efficient queries
fileSchema.index({ task: 1, originalName: 1 });
fileSchema.index({ project: 1, originalName: 1 });
fileSchema.index({ uploader: 1, createdAt: -1 });

const File = mongoose.model('File', fileSchema);

module.exports = File;
