const mongoose = require('mongoose');

const loginActivitySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    loginTime: {
        type: Date,
        required: true,
        index: true
    },
    logoutTime: {
        type: Date,
        index: true
    },
    sessionDuration: {
        type: Number, // Duration in seconds
        default: 0
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true, // true = still logged in, false = logged out
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
loginActivitySchema.index({ user: 1, loginTime: -1 });
loginActivitySchema.index({ loginTime: -1 }); // For latest activity queries
loginActivitySchema.index({ isActive: 1, user: 1 }); // For active sessions

// Virtual to check if session is active
loginActivitySchema.virtual('status').get(function () {
    return this.logoutTime ? 'inactive' : 'active';
});

// Method to update logout time and calculate duration
loginActivitySchema.methods.logout = function () {
    this.logoutTime = new Date();
    this.sessionDuration = Math.floor((this.logoutTime - this.loginTime) / 1000); // seconds
    this.isActive = false;
    return this.save();
};

const LoginActivity = mongoose.model('LoginActivity', loginActivitySchema);

module.exports = LoginActivity;
