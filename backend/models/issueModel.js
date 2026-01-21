const mongoose = require('mongoose');

const issueSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
        default: 'Open'
    }
}, { timestamps: true });

module.exports = mongoose.model('Issue', issueSchema);
