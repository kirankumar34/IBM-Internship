require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { initSocket } = require('./config/socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
// Serve static files from uploads
app.use('/uploads', express.static('uploads'));

// Make io accessible to routes
app.use((req, res, next) => {
    req.io = io;
    const fs = require('fs');
    res.on('finish', () => {
        const logLine = `${req.method} ${req.originalUrl} ${res.statusCode}\n`;
        fs.appendFileSync('request_logs.txt', logLine);
    });
    next();
});

// Load Models (to ensure schemas are registered)
require('./models/userModel');
require('./models/teamModel');
require('./models/projectModel');
require('./models/taskModel');
// Module 5 & 6: New Models
require('./models/timeLogModel');
require('./models/timesheetModel');
require('./models/commentModel');
require('./models/fileModel');
require('./models/loginActivityModel');
require('./models/discussionModel');
require('./models/notificationModel');
require('./models/timerSessionModel');
require('./models/emailLogModel');  // Email simulation logs
require('./models/issueModel');

// Database Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_mgmt_app');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
// Module 5: Time Tracking
app.use('/api/timelogs', require('./routes/timeLogRoutes'));
app.use('/api/timesheets', require('./routes/timesheetRoutes'));
// Module 6: Collaboration
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
// Super Admin: Analytics
app.use('/api/analytics', require('./routes/analyticsRoutes'));
// Module 6.2: Discussions
app.use('/api/discussions', require('./routes/discussionRoutes'));
// Module 7: Notifications
app.use('/api/notifications', require('./routes/notificationRoutes'));
// Module 5: Timer
app.use('/api/timer', require('./routes/timerRoutes'));


// Module 7: Issues
app.use('/api/issues', require('./routes/issueRoutes'));

// Module 10: Manual Deadline Check Endpoint (for testing/demo)
app.get('/api/admin/check-deadlines', async (req, res) => {
    try {
        const { triggerManualCheck } = require('./services/deadlineReminderService');
        const result = await triggerManualCheck();
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Root Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        console.log('Socket.io initialized for real-time notifications');

        // Module 10: Start Background Deadline Reminder Worker
        const { startDeadlineWorker } = require('./services/deadlineReminderService');
        startDeadlineWorker();
        console.log('Deadline reminder background worker started (runs every hour)');
    });
});

