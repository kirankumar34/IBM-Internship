const Notification = require('../models/notificationModel');

const createNotification = async ({ recipient, sender, type, title, message, refModel, refId }) => {
    try {
        if (!recipient) return;

        // Prevent self-notification if needed (though logic usually handles this before calling)
        if (sender && recipient.toString() === sender.toString()) return;

        const notification = await Notification.create({
            recipient,
            sender,
            type,
            title,
            message,
            refModel,
            refId,
            isRead: false
        });

        // If we had a socket instance, we would emit here
        // if (global.io) {
        //     global.io.to(recipient.toString()).emit('notification', notification);
        // }

        return notification;
    } catch (error) {
        console.error('Notification Service Error:', error.message);
    }
};

module.exports = { createNotification };
