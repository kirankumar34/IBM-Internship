import React, { useState, useEffect, useContext, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../context/api';
import AuthContext from '../../context/AuthContext';

const NotificationBell = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
            // Poll for updates every 30 seconds
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await api.get('/notifications/unread-count');
            setUnreadCount(res.data.count);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await api.get('/notifications?limit=10');
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n =>
                n._id === id ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.put('/notifications/mark-all-read');
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(notifications.filter(n => n._id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleClick = (notification) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification._id);
        }
        setIsOpen(false);

        // Navigate based on ref
        if (notification.refModel && notification.refId) {
            switch (notification.refModel) {
                case 'Task':
                case 'Project':
                    navigate(`/projects/${notification.refId}`);
                    break;
                case 'Timesheet':
                    navigate('/timesheets');
                    break;
                default:
                    break;
            }
        }
    };

    const getNotificationIcon = (type) => {
        const icons = {
            task_assigned: '📋',
            task_updated: '✏️',
            comment_mention: '💬',
            comment_added: '💬',
            discussion_mention: '📢',
            discussion_reply: '↩️',
            timesheet_submitted: '⏰',
            timesheet_approved: '✅',
            timesheet_rejected: '❌',
            file_uploaded: '📎',
            project_update: '📁',
            milestone_completed: '🎯',
            system: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    };

    const formatTime = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-dark-700 rounded-xl transition"
            >
                <Bell size={20} className="text-dark-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-dark-700">
                        <h3 className="text-white font-bold">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1"
                                >
                                    <CheckCheck size={14} />
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-dark-700 rounded-lg text-dark-400"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell size={32} className="mx-auto text-dark-600 mb-2" />
                                <p className="text-dark-400 text-sm">No notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-dark-700">
                                {notifications.map(notification => (
                                    <div
                                        key={notification._id}
                                        className={`p-4 hover:bg-dark-700/50 transition cursor-pointer ${!notification.isRead ? 'bg-primary/5' : ''
                                            }`}
                                        onClick={() => handleClick(notification)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm ${notification.isRead ? 'text-dark-300' : 'text-white font-medium'}`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.isRead && (
                                                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5"></div>
                                                    )}
                                                </div>
                                                <p className="text-dark-400 text-xs mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-dark-500 text-[10px] mt-2">
                                                    {formatTime(notification.createdAt)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(notification._id); }}
                                                className="p-1 hover:bg-dark-600 rounded-lg text-dark-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-dark-700 text-center">
                            <button
                                onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                                className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 mx-auto"
                            >
                                View all notifications
                                <ExternalLink size={12} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
