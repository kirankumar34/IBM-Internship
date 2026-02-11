import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (user && user.token) {
            // Derive socket URL: VITE_SOCKET_URL > VITE_API_URL (strip /api) > localhost fallback
            const socketUrl = import.meta.env.VITE_SOCKET_URL
                || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '')
                || 'http://localhost:5000';

            const newSocket = io(socketUrl, {
                auth: {
                    token: user.token
                },
                transports: ['websocket', 'polling']
            });

            newSocket.on('connect', () => {
                console.log('Socket connected');
                setIsConnected(true);
            });

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
            });

            newSocket.on('connect_error', (error) => {
                console.error('Socket connection error:', error.message);
                setIsConnected(false);
            });

            // Handle incoming notifications
            newSocket.on('notification', (notification) => {
                // Show toast for new notifications
                toast.info(notification.title, {
                    onClick: () => {
                        // Handle navigation based on notification type
                        if (notification.refModel && notification.refId) {
                            switch (notification.refModel) {
                                case 'Task':
                                case 'Project':
                                    window.location.href = `/projects/${notification.refId}`;
                                    break;
                                case 'Timesheet':
                                    window.location.href = '/timesheets';
                                    break;
                                default:
                                    break;
                            }
                        }
                    }
                });
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [user]);

    const joinProject = (projectId) => {
        if (socket && isConnected) {
            socket.emit('join_project', projectId);
        }
    };

    const leaveProject = (projectId) => {
        if (socket && isConnected) {
            socket.emit('leave_project', projectId);
        }
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, joinProject, leaveProject }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
