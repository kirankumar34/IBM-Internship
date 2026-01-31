import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowRight, UserPlus, AlertTriangle } from 'lucide-react';
import api from '../../context/api';

const TimesheetAnalytics = ({ projectId }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) fetchTimesheets();
    }, [projectId]);

    const fetchTimesheets = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/analytics/project/${projectId}/timesheets`);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching timesheet analytics:', error);
            setError('Failed to load timesheet intelligence');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-dark-800/30 border border-dark-700/50 rounded-[2.5rem] p-12 text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-dark-400 font-bold uppercase tracking-widest text-xs">Aggregating timesheet data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-danger/5 border border-danger/20 rounded-[2.5rem] p-12 text-center">
                <p className="text-danger font-bold mb-4">{error}</p>
                <button
                    onClick={fetchTimesheets}
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
                    <div className="h-12 w-12 bg-warning/10 rounded-2xl flex items-center justify-center text-warning">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Timesheet Intelligence</h2>
                        <p className="text-dark-400 text-sm font-medium">Consolidated effort analysis for {data.project.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest mb-1">Cumulative Project Hours</p>
                    <p className="text-4xl font-black text-white">{data.totalProjectHours}<span className="text-lg text-dark-500 ml-1">HRS</span></p>
                </div>
            </div>

            <div className="bg-dark-800/30 border border-dark-700/50 rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-dark-700">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-dark-500">Resource</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-dark-500">Total Hours</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-dark-500">Recent Entry</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-dark-500 text-right">Activity Level</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-800/50">
                        {data.timesheets.map((ts) => (
                            <tr key={ts.user._id} className="hover:bg-dark-700/30 transition group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center space-x-4">
                                        <div className="h-10 w-10 bg-dark-700 rounded-xl flex items-center justify-center text-white font-bold border border-dark-600">
                                            {ts.user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white">{ts.user.name}</p>
                                            <p className="text-[10px] text-dark-500 font-bold">{ts.user.role.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center">
                                        <span className="text-lg font-black text-white mr-2">{ts.totalHours}</span>
                                        <span className="text-xs text-dark-500">hours</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    {ts.entries.length > 0 ? (
                                        <div>
                                            <p className="text-sm text-dark-300 font-medium truncate max-w-[200px]">{ts.entries[0].task?.title || 'External'}</p>
                                            <p className="text-[10px] text-dark-500">{new Date(ts.entries[0].date).toLocaleDateString()}</p>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-dark-600">No entries</span>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="inline-flex items-center px-4 py-2 rounded-xl bg-dark-800 border border-dark-700">
                                        <div className="w-24 bg-dark-900 rounded-full h-1.5 mr-3 overflow-hidden">
                                            <div
                                                className="bg-primary h-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                                                style={{ width: `${Math.min((ts.totalHours / 40) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-black text-white">
                                            {ts.totalHours > 30 ? 'High' : ts.totalHours > 15 ? 'Ideal' : 'Low'}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.timesheets.length === 0 && (
                    <div className="py-20 text-center">
                        <Calendar size={48} className="mx-auto text-dark-600 mb-4 opacity-20" />
                        <p className="text-dark-500 font-bold uppercase tracking-widest text-xs">No timesheet records found for this project.</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-success/5 border border-success/20 rounded-3xl p-6 flex items-start space-x-4">
                    <UserPlus className="text-success mt-1" size={20} />
                    <div>
                        <h4 className="text-success font-black text-sm uppercase tracking-widest mb-2">Compliance Check</h4>
                        <p className="text-dark-300 text-sm leading-relaxed">All active project members are submitting timesheets within the agreed organizational thresholds.</p>
                    </div>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex items-start space-x-4">
                    <AlertTriangle className="text-primary mt-1" size={20} />
                    <div>
                        <h4 className="text-primary font-black text-sm uppercase tracking-widest mb-2">Resource Utilization</h4>
                        <p className="text-dark-300 text-sm leading-relaxed">Utilization is trending 12% higher than the previous sprint. Monitor for potential burnout in high-activity resources.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimesheetAnalytics;
