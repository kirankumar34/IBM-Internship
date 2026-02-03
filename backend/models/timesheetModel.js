const mongoose = require('mongoose');

const timesheetSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    weekStartDate: {
        type: Date,
        required: true,
        index: true
    },
    weekEndDate: {
        type: Date,
        required: true
    },
    entries: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TimeLog'
    }],
    totalHours: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'rejected'],
        default: 'draft',
        index: true
    },
    approver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    submittedAt: {
        type: Date
    },
    approvedAt: {
        type: Date
    },
    rejectionReason: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Compound index for unique weekly timesheets per user
timesheetSchema.index({ user: 1, weekStartDate: 1 }, { unique: true });

// Calculate total hours from entries
timesheetSchema.methods.calculateTotalHours = async function () {
    await this.populate('entries');
    this.totalHours = this.entries.filter(e => e != null).reduce((sum, entry) => sum + (entry.duration || 0), 0);
    return this.totalHours;
};

const Timesheet = mongoose.model('Timesheet', timesheetSchema);

module.exports = Timesheet;
