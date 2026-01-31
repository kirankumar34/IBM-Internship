const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
    user: {
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
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Validation: comment must be attached to either task or project (not both, not neither)
commentSchema.pre('save', function (next) {
    const hasTask = this.task != null;
    const hasProject = this.project != null;

    if (hasTask && hasProject) {
        next(new Error('Comment cannot be attached to both task and project'));
    } else if (!hasTask && !hasProject) {
        next(new Error('Comment must be attached to either task or project'));
    } else {
        next();
    }
});

// Compound indexes for efficient queries
commentSchema.index({ task: 1, createdAt: -1 });
commentSchema.index({ project: 1, createdAt: -1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
