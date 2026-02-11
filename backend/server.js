require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('colors'); // To make logs colorful
const { initSocket } = require('./config/socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Middleware
app.use(express.json());

// CORS Configuration (Production Ready)
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(helmet());

// Logging (Production Optimization)
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Serve static files
app.use('/uploads', express.static('uploads'));

// Make io accessible to routes & simple logging
app.use((req, res, next) => {
    req.io = io;
    const fs = require('fs');
    res.on('finish', () => {
        // Keeping business logic logging
        const logLine = `${req.method} ${req.originalUrl} ${res.statusCode}\n`;
        // To avoid cluttering in production, we might want to comment this out, but requested to NOT change business logic.
        // So we keep it. 
        try {
            fs.appendFileSync('request_logs.txt', logLine);
        } catch (err) {
            // Ignored file write error
        }
    });
    next();
});

// Load Models
require('./models/userModel');
require('./models/teamModel');
require('./models/projectModel');
require('./models/taskModel');
require('./models/timeLogModel');
require('./models/timesheetModel');
require('./models/commentModel');
require('./models/fileModel');
require('./models/loginActivityModel');
require('./models/discussionModel');
require('./models/notificationModel');
require('./models/timerSessionModel');
require('./models/emailLogModel');
require('./models/issueModel');

// Database Connection
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('Error: MONGO_URI is not defined in environment variables.'.red);
            if (process.env.NODE_ENV === 'production') {
                console.error('Cannot start in production without MONGO_URI. Exiting.'.red);
                process.exit(1);
            }
            console.warn('Warning: No MONGO_URI set. Database features will not work.'.yellow);
            return;
        }
        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`.red);
        if (process.env.NODE_ENV === 'production') {
            console.error('Exiting due to MongoDB connection failure in production.'.red);
            process.exit(1);
        }
        console.warn('Server will start without database connection.'.yellow);
    }
};

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/timelogs', require('./routes/timeLogRoutes'));
app.use('/api/timesheets', require('./routes/timesheetRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/discussions', require('./routes/discussionRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/timer', require('./routes/timerRoutes'));
app.use('/api/issues', require('./routes/issueRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Manual Deadline Check (Testing)
app.get('/api/admin/check-deadlines', async (req, res) => {
    try {
        const { triggerManualCheck } = require('./services/deadlineReminderService');
        const result = await triggerManualCheck();
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Production Health Check
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: "ok",
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus
    });
});

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
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        console.log('Socket.io initialized');

        // Start Background Deadline Worker
        try {
            const { startDeadlineWorker } = require('./services/deadlineReminderService');
            startDeadlineWorker();
        } catch (err) {
            console.warn('Deadline worker failed to start:', err.message);
        }
    });
}).catch((err) => {
    console.error('Failed to initialize:', err.message);
    // Start server anyway so health check endpoint works
    server.listen(PORT, () => {
        console.log(`Server started on port ${PORT} (DB connection pending)`);
    });
});

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`.red);
    // process.exit(1); // Optional: Restart on crash
});
