const mongoose = require('mongoose');

const organizationSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Organization', organizationSchema);
