const Notification = require('../models/notificationModel');
const { emitToUser } = require('../config/socket');

/**
 * Create notification and emit via Socket.io
 * @param {Object} data - Notification data
 * @param {ObjectId} data.recipient - User ID to receive notification
 * @param {ObjectId} data.sender - User ID who triggered the notification
 * @param {String} data.type - Notification type
 * @param {String} data.title - Notification title
 * @param {String} data.message - Notification message
 * @param {String} data.refModel - Reference model type
 * @param {ObjectId} data.refId - Reference model ID
 */
const createNotification = async (data) => {
    try {
        const notification = await Notification.create(data);
        await notification.populate('sender', 'name');

        // Emit via Socket.io
        emitToUser(data.recipient.toString(), 'notification', notification);

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

/**
 * Create notifications for multiple recipients
 */
const createBulkNotifications = async (recipients, baseData) => {
    const notifications = [];
    for (const recipientId of recipients) {
        const notification = await createNotification({
            ...baseData,
            recipient: recipientId
        });
        if (notification) {
            notifications.push(notification);
        }
    }
    return notifications;
};

// Notification types with default messages
const NotificationTypes = {
    TASK_ASSIGNED: 'task_assigned',
    TASK_UPDATED: 'task_updated',
    COMMENT_MENTION: 'comment_mention',
    COMMENT_ADDED: 'comment_added',
    DISCUSSION_MENTION: 'discussion_mention',
    DISCUSSION_REPLY: 'discussion_reply',
    TIMESHEET_SUBMITTED: 'timesheet_submitted',
    TIMESHEET_APPROVED: 'timesheet_approved',
    TIMESHEET_REJECTED: 'timesheet_rejected',
    FILE_UPLOADED: 'file_uploaded',
    PROJECT_UPDATE: 'project_update',
    MILESTONE_COMPLETED: 'milestone_completed',
    SYSTEM: 'system'
};

module.exports = {
    createNotification,
    createBulkNotifications,
    NotificationTypes
};
