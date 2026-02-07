/**
 * DEADLINE REMINDER SERVICE (Module 10: Notifications & Alerts)
 * 
 * Background worker that runs periodically to check for upcoming deadlines
 * and sends notifications/email simulations to assigned users.
 * 
 * Strategy: "No-UI" - runs in server background without frontend changes
 */

const Task = require('../models/taskModel');
const Notification = require('../models/notificationModel');
const { sendEmail } = require('./emailService');

// Configuration
const REMINDER_INTERVALS = {
    OVERDUE: 0,           // Already past due
    DUE_TODAY: 0,         // Due today
    DUE_TOMORROW: 1,      // Due in 1 day
    DUE_THIS_WEEK: 7      // Due within 7 days
};

/**
 * Check for tasks with upcoming deadlines and create notifications
 * This function should be called periodically (e.g., every hour via setInterval)
 */
const checkDeadlines = async () => {
    console.log('[DeadlineReminder] Running deadline check at', new Date().toISOString());

    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        // Find tasks that are:
        // 1. Not completed
        // 2. Have a due date
        // 3. Due within the next 7 days OR overdue
        const tasksNeedingReminder = await Task.find({
            status: { $nin: ['Completed', 'Cancelled'] },
            dueDate: { $exists: true, $ne: null },
            $or: [
                { dueDate: { $lt: today } },           // Overdue
                { dueDate: { $gte: today, $lt: nextWeek } }  // Due within a week
            ]
        }).populate('assignedTo', 'name email _id')
            .populate('project', 'name');

        console.log(`[DeadlineReminder] Found ${tasksNeedingReminder.length} tasks needing attention`);

        let notificationsCreated = 0;
        let emailsSimulated = 0;

        for (const task of tasksNeedingReminder) {
            if (!task.assignedTo) continue;

            const dueDate = new Date(task.dueDate);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            let urgency = '';
            let notificationType = 'task_updated';

            if (daysUntilDue < 0) {
                urgency = 'OVERDUE';
                notificationType = 'task_updated';
            } else if (daysUntilDue === 0) {
                urgency = 'DUE TODAY';
            } else if (daysUntilDue === 1) {
                urgency = 'DUE TOMORROW';
            } else {
                urgency = `DUE IN ${daysUntilDue} DAYS`;
            }

            // Check if we already sent a reminder for this task today
            const existingReminder = await Notification.findOne({
                recipient: task.assignedTo._id,
                refId: task._id,
                refModel: 'Task',
                createdAt: { $gte: today }
            });

            if (existingReminder) {
                // Already notified today, skip
                continue;
            }

            // Create notification
            await Notification.create({
                recipient: task.assignedTo._id,
                type: notificationType,
                title: `⏰ Task ${urgency}`,
                message: `"${task.title}" in ${task.project?.name || 'Unknown Project'} is ${urgency.toLowerCase()}. Due: ${dueDate.toLocaleDateString()}`,
                refModel: 'Task',
                refId: task._id,
                isRead: false
            });
            notificationsCreated++;

            // Simulate email for critical deadlines (overdue or due today)
            if (daysUntilDue <= 0 && task.assignedTo.email) {
                await sendEmail({
                    recipient: task.assignedTo.email,
                    recipientName: task.assignedTo.name,
                    subject: `⚠️ Task ${urgency}: ${task.title}`,
                    body: `Hello ${task.assignedTo.name},\n\nThis is an automated reminder that your task "${task.title}" is ${urgency.toLowerCase()}.\n\nProject: ${task.project?.name || 'Unknown'}\nDue Date: ${dueDate.toLocaleDateString()}\n\nPlease log in to the Project Management System to update your progress.\n\nBest regards,\nProject Management System`,
                    type: 'system',
                    metadata: { taskId: task._id, urgency }
                });
                emailsSimulated++;
            }
        }

        console.log(`[DeadlineReminder] Created ${notificationsCreated} notifications, simulated ${emailsSimulated} emails`);
        return { notificationsCreated, emailsSimulated };

    } catch (error) {
        console.error('[DeadlineReminder] Error:', error.message);
        return { error: error.message };
    }
};

/**
 * Start the deadline reminder worker
 * Runs every hour to check for upcoming deadlines
 */
const startDeadlineWorker = () => {
    console.log('[DeadlineReminder] Starting background worker (runs every hour)');

    // Run immediately on startup
    checkDeadlines();

    // Then run every hour (3600000 ms)
    const intervalId = setInterval(checkDeadlines, 60 * 60 * 1000);

    return intervalId;
};

/**
 * Manual trigger for testing (can be called via API)
 */
const triggerManualCheck = async () => {
    console.log('[DeadlineReminder] Manual check triggered');
    return await checkDeadlines();
};

module.exports = {
    checkDeadlines,
    startDeadlineWorker,
    triggerManualCheck
};
