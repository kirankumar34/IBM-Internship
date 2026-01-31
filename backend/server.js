require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
// Serve static files from uploads
app.use('/uploads', express.static('uploads'));

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
    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
});
