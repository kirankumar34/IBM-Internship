/**
 * EMAIL SERVICE TESTS
 * 
 * Tests for email simulation service
 */

const EmailLog = require('../models/emailLogModel');
const {
    sendEmail,
    sendTaskAssignmentEmail,
    sendTimesheetApprovedEmail,
    sendTimesheetRejectedEmail
} = require('../services/emailService');

describe('Email Service', () => {
    describe('sendEmail', () => {
        it('should create an email log entry', async () => {
            const result = await sendEmail({
                recipient: 'test@example.com',
                recipientName: 'Test User',
                subject: 'Test Subject',
                body: 'Test body content',
                type: 'system'
            });

            expect(result).toBeTruthy();
            expect(result.recipient).toBe('test@example.com');
            expect(result.subject).toBe('Test Subject');
            expect(result.status).toBe('simulated');
        });

        it('should store email in database', async () => {
            await sendEmail({
                recipient: 'stored@example.com',
                recipientName: 'Stored User',
                subject: 'Stored Email',
                body: 'This should be stored',
                type: 'task_assignment'
            });

            const emailLog = await EmailLog.findOne({ recipient: 'stored@example.com' });
            expect(emailLog).toBeTruthy();
            expect(emailLog.subject).toBe('Stored Email');
        });

        it('should store metadata', async () => {
            await sendEmail({
                recipient: 'meta@example.com',
                recipientName: 'Meta User',
                subject: 'With Metadata',
                body: 'Body',
                type: 'task_assignment',
                metadata: { taskId: '12345', priority: 'High' }
            });

            const emailLog = await EmailLog.findOne({ recipient: 'meta@example.com' });
            expect(emailLog.metadata.taskId).toBe('12345');
            expect(emailLog.metadata.priority).toBe('High');
        });
    });

    describe('sendTaskAssignmentEmail', () => {
        it('should send task assignment email', async () => {
            const result = await sendTaskAssignmentEmail(
                'assignee@example.com',
                'John Doe',
                'Implement Feature X',
                'Manager Smith'
            );

            expect(result).toBeTruthy();
            expect(result.type).toBe('task_assignment');
            expect(result.subject).toContain('Implement Feature X');
        });
    });

    describe('sendTimesheetApprovedEmail', () => {
        it('should send timesheet approved email', async () => {
            const result = await sendTimesheetApprovedEmail(
                'employee@example.com',
                'Jane Doe',
                '2026-02-01',
                '2026-02-07',
                'Manager Smith'
            );

            expect(result).toBeTruthy();
            expect(result.type).toBe('timesheet_approved');
            expect(result.subject).toContain('Approved');
        });
    });

    describe('sendTimesheetRejectedEmail', () => {
        it('should send timesheet rejected email with reason', async () => {
            const result = await sendTimesheetRejectedEmail(
                'employee@example.com',
                'Jane Doe',
                '2026-02-01',
                '2026-02-07',
                'Missing entries for Monday',
                'Manager Smith'
            );

            expect(result).toBeTruthy();
            expect(result.type).toBe('timesheet_rejected');
            expect(result.subject).toContain('Rejected');
            expect(result.body).toContain('Missing entries for Monday');
        });
    });
});
