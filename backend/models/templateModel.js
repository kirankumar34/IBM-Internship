const mongoose = require('mongoose');

const templateSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a template name'],
    },
    description: {
        type: String,
    },
    milestones: [{
        name: { type: String, required: true },
        description: { type: String },
        relativeDueDays: { type: Number, required: true }, // Days from project start
    }],
    tasks: [{
        title: { type: String, required: true },
        description: { type: String },
        priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
        relativeDueDays: { type: Number },
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Template', templateSchema);
