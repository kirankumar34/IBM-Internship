const mongoose = require('mongoose');

const taskSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Review', 'Done'],
        default: 'Open'
    },
    dueDate: { type: Date }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Task', taskSchema);
