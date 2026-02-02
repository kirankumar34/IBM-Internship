const jwt = require('jsonwebtoken');

let io = null;

const initSocket = (server) => {
    const { Server } = require('socket.io');

    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);

        // Join user's personal room for notifications
        socket.join(`user_${socket.userId}`);

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
        });

        // Handle joining project rooms
        socket.on('join_project', (projectId) => {
            socket.join(`project_${projectId}`);
            console.log(`User ${socket.userId} joined project ${projectId}`);
        });

        socket.on('leave_project', (projectId) => {
            socket.leave(`project_${projectId}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
};

const emitToProject = (projectId, event, data) => {
    if (io) {
        io.to(`project_${projectId}`).emit(event, data);
    }
};

module.exports = { initSocket, getIO, emitToUser, emitToProject };
