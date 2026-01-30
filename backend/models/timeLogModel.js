const mongoose = require('mongoose');

const timeLogSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
        index: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // Duration in hours (decimal)
        required: true
    },
    description: {
        type: String,
        maxlength: 500
    },
    isManual: {
        type: Boolean,
        default: true // true = manual entry, false = timer-based
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Calculate duration before saving
timeLogSchema.pre('save', function (next) {
    if (this.startTime && this.endTime) {
        const durationMs = this.endTime - this.startTime;
        this.duration = durationMs / (1000 * 60 * 60); // Convert to hours
    }
    next();
});

// Compound index for efficient queries
timeLogSchema.index({ user: 1, date: 1 });
timeLogSchema.index({ task: 1, date: 1 });
timeLogSchema.index({ project: 1, date: 1 });

const TimeLog = mongoose.model('TimeLog', timeLogSchema);

module.exports = TimeLog;
