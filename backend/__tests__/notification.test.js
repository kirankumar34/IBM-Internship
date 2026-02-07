/**
 * NOTIFICATION MODEL TESTS
 * 
 * Tests for notification creation and management
 */

const Notification = require('../models/notificationModel');

describe('Notification Model', () => {
    let testUser;

    beforeEach(async () => {
        testUser = await global.createTestUser();
    });

    describe('Notification Creation', () => {
        it('should create a notification', async () => {
            const notification = await Notification.create({
                recipient: testUser._id,
                type: 'task_assigned',
                title: 'New Task Assigned',
                message: 'You have been assigned a new task'
            });

            expect(notification._id).toBeDefined();
            expect(notification.title).toBe('New Task Assigned');
            expect(notification.isRead).toBe(false);
        });

        it('should default isRead to false', async () => {
            const notification = await Notification.create({
                recipient: testUser._id,
                type: 'task_assigned',
                title: 'Test',
                message: 'Test message'
            });

            expect(notification.isRead).toBe(false);
        });
    });

    describe('Notification Queries', () => {
        it('should find unread notifications for user', async () => {
            // Create multiple notifications
            await Notification.create({
                recipient: testUser._id,
                type: 'task_assigned',
                title: 'Unread 1',
                message: 'Message 1',
                isRead: false
            });

            await Notification.create({
                recipient: testUser._id,
                type: 'task_assigned',
                title: 'Read 1',
                message: 'Message 2',
                isRead: true
            });

            const unreadNotifications = await Notification.find({
                recipient: testUser._id,
                isRead: false
            });

            expect(unreadNotifications.length).toBe(1);
            expect(unreadNotifications[0].title).toBe('Unread 1');
        });

        it('should count unread notifications', async () => {
            await Notification.create({
                recipient: testUser._id,
                type: 'task_assigned',
                title: 'Notification 1',
                message: 'Message',
                isRead: false
            });

            await Notification.create({
                recipient: testUser._id,
                type: 'task_updated',
                title: 'Notification 2',
                message: 'Message',
                isRead: false
            });

            const count = await Notification.countDocuments({
                recipient: testUser._id,
                isRead: false
            });

            expect(count).toBe(2);
        });
    });

    describe('Mark as Read', () => {
        it('should mark notification as read', async () => {
            const notification = await Notification.create({
                recipient: testUser._id,
                type: 'task_assigned',
                title: 'Test',
                message: 'Test message',
                isRead: false
            });

            notification.isRead = true;
            await notification.save();

            const updated = await Notification.findById(notification._id);
            expect(updated.isRead).toBe(true);
        });

        it('should mark all notifications as read', async () => {
            await Notification.create({
                recipient: testUser._id,
                type: 'task_assigned',
                title: 'N1',
                message: 'M1',
                isRead: false
            });

            await Notification.create({
                recipient: testUser._id,
                type: 'task_updated',
                title: 'N2',
                message: 'M2',
                isRead: false
            });

            await Notification.updateMany(
                { recipient: testUser._id },
                { isRead: true }
            );

            const unreadCount = await Notification.countDocuments({
                recipient: testUser._id,
                isRead: false
            });

            expect(unreadCount).toBe(0);
        });
    });
});
