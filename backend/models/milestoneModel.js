const mongoose = require('mongoose');

const milestoneSchema = mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    startDate: { type: Date },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Completed'],
        default: 'Pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Milestone', milestoneSchema);

