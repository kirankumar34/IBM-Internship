const mongoose = require('mongoose');

const activitySchema = mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    details: {
        type: String
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Activity', activitySchema);
