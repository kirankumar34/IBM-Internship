const mongoose = require('mongoose');

const emailLogSchema = mongoose.Schema({
    recipient: {
        type: String,
        required: true
    },
    recipientName: {
        type: String
    },
    subject: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['task_assignment', 'timesheet_approved', 'timesheet_rejected', 'issue_assigned', 'milestone_completed', 'system'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'simulated', 'failed'],
        default: 'simulated'
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
emailLogSchema.index({ recipient: 1, createdAt: -1 });
emailLogSchema.index({ type: 1, createdAt: -1 });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

module.exports = EmailLog;
