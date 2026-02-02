const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: [
            'task_assigned',
            'task_updated',
            'comment_mention',
            'comment_added',
            'discussion_mention',
            'discussion_reply',
            'timesheet_submitted',
            'timesheet_approved',
            'timesheet_rejected',
            'file_uploaded',
            'project_update',
            'milestone_completed',
            'system'
        ],
        required: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    // Polymorphic reference for redirect on click
    refModel: {
        type: String,
        enum: ['Task', 'Project', 'Discussion', 'Timesheet', 'Comment', 'File']
    },
    refId: {
        type: mongoose.Schema.Types.ObjectId
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Compound index for efficient unread queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Static method to create and emit notification
notificationSchema.statics.createAndEmit = async function (io, data) {
    const notification = await this.create(data);
    await notification.populate('sender', 'name');

    // Emit to specific user room if io is available
    if (io) {
        io.to(`user_${data.recipient}`).emit('notification', notification);
    }

    return notification;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
