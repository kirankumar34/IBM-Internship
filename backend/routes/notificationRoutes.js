const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Notification = require('../models/notificationModel');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { recipient: req.user.id };
    if (unreadOnly === 'true') {
        query.isRead = false;
    }

    const notifications = await Notification.find(query)
        .populate('sender', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });

    res.json({
        notifications,
        total,
        unreadCount,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
    });
});

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
    res.json({ count });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    if (notification.recipient.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user.id, isRead: false },
        { isRead: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        res.status(404);
        throw new Error('Notification not found');
    }

    if (notification.recipient.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized');
    }

    await notification.deleteOne();
    res.json({ id: req.params.id });
});

// @desc    Clear all notifications
// @route   DELETE /api/notifications/clear-all
// @access  Private
const clearAllNotifications = asyncHandler(async (req, res) => {
    await Notification.deleteMany({ recipient: req.user.id });
    res.json({ message: 'All notifications cleared' });
});

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/clear-all', clearAllNotifications);

module.exports = router;
