import React, { useState, useEffect } from 'react';
import { Users, Clock, LogIn, LogOut, TrendingUp } from 'lucide-react';
import api from '../../context/api';

const EmployeeActivityView = ({ projectId }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) fetchActivity();
    }, [projectId]);

    const fetchActivity = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/analytics/project/${projectId}/activity`);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching employee activity:', error);
            setError('Failed to load personnel activity');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-dark-800/30 border border-dark-700/50 rounded-[2.5rem] p-12 text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-dark-400 font-bold uppercase tracking-widest text-xs">Scanning personnel activity...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-danger/5 border border-danger/20 rounded-[2.5rem] p-12 text-center">
                <p className="text-danger font-bold mb-4">{error}</p>
                <button
                    onClick={fetchActivity}
                    className="px-6 py-2 bg-dark-800 text-white rounded-xl hover:bg-dark-700 transition border border-dark-600 font-bold text-xs uppercase"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Personnel Engagement</h2>
                        <p className="text-dark-400 text-sm font-medium">Tracking presence and effort across {data.project.name}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.userActivity.map((activity) => (
                    <div key={activity.user.id} className="bg-dark-800/50 border border-dark-700/50 rounded-3xl p-6 hover:border-primary/30 transition-all group">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <div className="h-12 w-12 bg-dark-700 rounded-xl flex items-center justify-center text-white font-black text-lg border border-dark-600">
                                    {activity.user.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold">{activity.user.name}</h4>
                                    <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest">{activity.user.role.replace('_', ' ')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest">Total Effort</p>
                                <p className="text-xl font-black text-primary">{activity.totalHours.toFixed(1)}h</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest mb-2 flex items-center">
                                    <Clock size={12} className="mr-1" /> Recent Session
                                </p>
                                {activity.logins.length > 0 ? (
                                    <div className="bg-dark-900/50 rounded-xl p-3 border border-dark-800">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center text-success text-[10px] font-bold">
                                                <LogIn size={10} className="mr-1" /> {new Date(activity.logins[0].loginTime).toLocaleDateString()}
                                            </div>
                                            <div className="text-white text-[10px] font-black">
                                                {new Date(activity.logins[0].loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center text-dark-500 text-[10px] font-bold">
                                                <LogOut size={10} className="mr-1" /> Logout
                                            </div>
                                            <div className="text-dark-400 text-[10px]">
                                                {activity.logins[0].logoutTime
                                                    ? new Date(activity.logins[0].logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : 'Active Now'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-dark-600 italic">No recent login data</p>
                                )}
                            </div>

                            <div>
                                <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest mb-2 flex items-center">
                                    <TrendingUp size={12} className="mr-1" /> Contribution Breakdown
                                </p>
                                <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar pr-1">
                                    {activity.timeLogs.slice(0, 3).map((log, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-[11px] font-medium">
                                            <span className="text-dark-300 truncate w-32">{log.task?.title || 'System'}</span>
                                            <span className="text-white font-bold">{log.duration}h</span>
                                        </div>
                                    ))}
                                    {activity.timeLogs.length === 0 && <p className="text-xs text-dark-600 italic">No time logged yet</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmployeeActivityView;
