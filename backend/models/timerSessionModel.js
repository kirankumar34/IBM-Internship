const mongoose = require('mongoose');

const timerSessionSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number, // Duration in seconds
        default: 0
    },
    description: {
        type: String,
        maxlength: 500
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

// Only one active timer per user
timerSessionSchema.index({ user: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

const TimerSession = mongoose.model('TimerSession', timerSessionSchema);

module.exports = TimerSession;
