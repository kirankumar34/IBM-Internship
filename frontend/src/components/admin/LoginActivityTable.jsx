import React, { useState, useEffect } from 'react';
import { Activity, Clock, User, Calendar } from 'lucide-react';
import api from '../../context/api';

const LoginActivityTable = () => {
    const [activities, setActivities] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        userId: ''
    });

    useEffect(() => {
        fetchActivity();
    }, [filters]);

    const fetchActivity = async () => {
        setLoading(true);
        try {
            const response = await api.get('/analytics/login-activity', {
                params: {
                    startDate: filters.startDate || undefined,
                    endDate: filters.endDate || undefined,
                    userId: filters.userId || undefined
                }
            });

            setActivities(response.data.activities);
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching login activity:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="bg-dark-900 border border-dark-600 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <Activity size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Login Activity</h2>
                        <p className="text-sm text-gray-400">Monitor user sessions</p>
                    </div>
                </div>

                {stats && (
                    <div className="flex gap-4">
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
                            <p className="text-xs text-green-400 mb-1">Active Now</p>
                            <p className="text-2xl font-bold text-green-400">{stats.activeSessions}</p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
                            <p className="text-xs text-blue-400 mb-1">Total Sessions</p>
                            <p className="text-2xl font-bold text-blue-400">{stats.totalSessions}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">From Date</label>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">To Date</label>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={() => setFilters({ startDate: '', endDate: '', userId: '' })}
                        className="w-full bg-dark-800 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-dark-700 transition"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Activity Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dark-600">
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">User</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Role</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Login Time</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Logout Time</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Duration</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : activities.length > 0 ? (
                            activities.map(activity => (
                                <tr key={activity._id} className="border-b border-dark-700 hover:bg-dark-800/50 transition">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                {activity.user?.name?.charAt(0)}
                                            </div>
                                            <span className="text-sm text-white">{activity.user?.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-xs px-2 py-1 bg-dark-700 text-gray-300 rounded">
                                            {activity.user?.role?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-300">
                                        {new Date(activity.loginTime).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-300">
                                        {activity.logoutTime
                                            ? new Date(activity.logoutTime).toLocaleString()
                                            : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-300">
                                        {formatDuration(activity.sessionDuration)}
                                    </td>
                                    <td className="py-3 px-4">
                                        {activity.logoutTime ? (
                                            <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">
                                                Inactive
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1 w-fit">
                                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                                Active
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500">
                                    No activity found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LoginActivityTable;
