/**
 * EMAIL SERVICE - Simulates email notifications
 * 
 * This service logs emails to database (EmailLog model) and console
 * for demonstration purposes. In production, this would integrate with SMTP.
 */

const EmailLog = require('../models/emailLogModel');

/**
 * Send (simulate) an email
 * @param {Object} options - Email options
 * @param {string} options.recipient - Recipient email
 * @param {string} options.recipientName - Recipient name
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Email body
 * @param {string} options.type - Email type (task_assignment, timesheet_approved, etc.)
 * @param {Object} options.metadata - Additional metadata
 */
const sendEmail = async ({ recipient, recipientName, subject, body, type, metadata = {} }) => {
    try {
        // Log to database
        const emailLog = await EmailLog.create({
            recipient,
            recipientName,
            subject,
            body,
            type,
            status: 'simulated',
            metadata
        });

        // Console log for visibility (simulation)
        console.log('========== EMAIL SIMULATION ==========');
        console.log(`To: ${recipient} (${recipientName || 'Unknown'})`);
        console.log(`Subject: ${subject}`);
        console.log(`Type: ${type}`);
        console.log(`Body:\n${body}`);
        console.log('======================================');

        return emailLog;
    } catch (error) {
        console.error('Email simulation error:', error.message);
        return null;
    }
};

/**
 * Send task assignment email
 */
const sendTaskAssignmentEmail = async (recipientEmail, recipientName, taskTitle, assignedBy) => {
    return await sendEmail({
        recipient: recipientEmail,
        recipientName,
        subject: `New Task Assignment: ${taskTitle}`,
        body: `Hello ${recipientName},\n\nYou have been assigned to a new task: "${taskTitle}".\n\nAssigned by: ${assignedBy}\n\nPlease log in to the Project Management System to view details.\n\nBest regards,\nProject Management System`,
        type: 'task_assignment',
        metadata: { taskTitle, assignedBy }
    });
};

/**
 * Send timesheet approved email
 */
const sendTimesheetApprovedEmail = async (recipientEmail, recipientName, weekStart, weekEnd, approvedBy) => {
    return await sendEmail({
        recipient: recipientEmail,
        recipientName,
        subject: `Timesheet Approved: ${weekStart} - ${weekEnd}`,
        body: `Hello ${recipientName},\n\nYour timesheet for the week of ${weekStart} - ${weekEnd} has been approved.\n\nApproved by: ${approvedBy}\n\nBest regards,\nProject Management System`,
        type: 'timesheet_approved',
        metadata: { weekStart, weekEnd, approvedBy }
    });
};

/**
 * Send timesheet rejected email
 */
const sendTimesheetRejectedEmail = async (recipientEmail, recipientName, weekStart, weekEnd, reason, rejectedBy) => {
    return await sendEmail({
        recipient: recipientEmail,
        recipientName,
        subject: `Timesheet Rejected: ${weekStart} - ${weekEnd}`,
        body: `Hello ${recipientName},\n\nYour timesheet for the week of ${weekStart} - ${weekEnd} has been rejected.\n\nReason: ${reason}\nRejected by: ${rejectedBy}\n\nPlease revise and resubmit.\n\nBest regards,\nProject Management System`,
        type: 'timesheet_rejected',
        metadata: { weekStart, weekEnd, reason, rejectedBy }
    });
};

/**
 * Send issue assignment email
 */
const sendIssueAssignmentEmail = async (recipientEmail, recipientName, issueTitle, severity, assignedBy) => {
    return await sendEmail({
        recipient: recipientEmail,
        recipientName,
        subject: `Issue Assigned: ${issueTitle} [${severity}]`,
        body: `Hello ${recipientName},\n\nYou have been assigned to an issue: "${issueTitle}".\n\nSeverity: ${severity}\nAssigned by: ${assignedBy}\n\nPlease log in to the Project Management System to view details.\n\nBest regards,\nProject Management System`,
        type: 'issue_assigned',
        metadata: { issueTitle, severity, assignedBy }
    });
};

module.exports = {
    sendEmail,
    sendTaskAssignmentEmail,
    sendTimesheetApprovedEmail,
    sendTimesheetRejectedEmail,
    sendIssueAssignmentEmail
};
