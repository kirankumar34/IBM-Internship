import React, { useState, useEffect, useContext } from 'react';
import { Bell, CheckCheck, Trash2, ExternalLink, Filter, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../context/api';
import AuthContext from '../context/AuthContext';

const Notifications = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchNotifications();
    }, [page, filter]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page, limit: 20 });
            if (filter === 'unread') params.append('unreadOnly', 'true');

            const res = await api.get(`/notifications?${params}`);
            setNotifications(res.data.notifications);
            setTotalPages(res.data.pages);
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
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.put('/notifications/mark-all-read');
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
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

    const handleClearAll = async () => {
        if (!window.confirm('Clear all notifications?')) return;
        try {
            await api.delete('/notifications/clear-all');
            setNotifications([]);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    const handleClick = (notification) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification._id);
        }

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
        if (mins < 60) return `${mins} minutes ago`;
        if (hours < 24) return `${hours} hours ago`;
        if (days < 7) return `${days} days ago`;
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white">Notifications</h1>
                    <p className="text-dark-400 text-sm mt-1">Stay updated with your activity</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleMarkAllAsRead}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 rounded-xl text-sm font-bold text-dark-300 hover:text-white transition"
                    >
                        <CheckCheck size={16} />
                        Mark All Read
                    </button>
                    <button
                        onClick={handleClearAll}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/30 transition"
                    >
                        <Trash2 size={16} />
                        Clear All
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-dark-800/50 border border-dark-700 rounded-2xl p-2">
                <button
                    onClick={() => { setFilter('all'); setPage(1); }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition ${filter === 'all' ? 'bg-primary text-dark-900' : 'text-dark-400 hover:text-white'
                        }`}
                >
                    All
                </button>
                <button
                    onClick={() => { setFilter('unread'); setPage(1); }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition ${filter === 'unread' ? 'bg-primary text-dark-900' : 'text-dark-400 hover:text-white'
                        }`}
                >
                    Unread
                </button>
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="bg-dark-800/50 border border-dark-700 rounded-3xl p-16 text-center">
                    <Bell size={64} className="mx-auto text-dark-600 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No notifications</h3>
                    <p className="text-dark-400">You're all caught up!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map(notification => (
                        <div
                            key={notification._id}
                            className={`bg-dark-800/50 border rounded-2xl p-5 hover:border-primary/30 transition cursor-pointer group ${!notification.isRead ? 'border-primary/20 bg-primary/5' : 'border-dark-700'
                                }`}
                            onClick={() => handleClick(notification)}
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className={`font-bold ${notification.isRead ? 'text-dark-300' : 'text-white'}`}>
                                                    {notification.title}
                                                </h3>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>
                                                )}
                                            </div>
                                            <p className="text-dark-400 text-sm">{notification.message}</p>
                                            <div className="flex items-center gap-3 mt-3 text-xs text-dark-500">
                                                <Clock size={12} />
                                                {formatTime(notification.createdAt)}
                                                {notification.sender && (
                                                    <span>• From {notification.sender.name}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                            {notification.refModel && (
                                                <button className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-primary">
                                                    <ExternalLink size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(notification._id); }}
                                                className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-red-400"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-10 h-10 rounded-xl font-bold transition ${p === page ? 'bg-primary text-dark-900' : 'bg-dark-800 text-dark-400 hover:text-white'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Notifications;
