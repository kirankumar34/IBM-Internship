import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, CheckCircle2, Clock } from 'lucide-react';
import axios from 'axios';

const ProjectAnalyticsCharts = ({ projectId }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            fetchAnalytics();
        }
    }, [projectId]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/analytics/project/${projectId}/progress`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalytics(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-dark-900 border border-dark-600 rounded-xl p-8 text-center">
                <p className="text-gray-400">Loading analytics...</p>
            </div>
        );
    }

    if (!analytics) {
        return null;
    }

    // Data for charts
    const milestoneData = Object.keys(analytics.milestones.byStatus).map(status => ({
        name: status,
        value: analytics.milestones.byStatus[status]
    }));

    const taskData = Object.keys(analytics.tasks.byStatus).map(status => ({
        name: status,
        value: analytics.tasks.byStatus[status]
    }));

    const COLORS = {
        'Completed': '#10b981',
        'In Progress': '#3b82f6',
        'Pending': '#f59e0b',
        'To Do': '#6b7280',
        'Done': '#10b981'
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <TrendingUp size={20} className="text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Project Analytics</h3>
                    <p className="text-sm text-gray-400">Real-time progress insights</p>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Target size={20} className="text-blue-400" />
                        <p className="text-xs text-blue-400 font-medium">Overall Progress</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.overallProgress}%</p>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle2 size={20} className="text-green-400" />
                        <p className="text-xs text-green-400 font-medium">Task Completion</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.tasks.completionRate}%</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Target size={20} className="text-purple-400" />
                        <p className="text-xs text-purple-400 font-medium">Milestones</p>
                    </div>
                    <p className="text-3xl font-bold text-white">
                        {analytics.milestones.completed}/{analytics.milestones.total}
                    </p>
                </div>

                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock size={20} className="text-orange-400" />
                        <p className="text-xs text-orange-400 font-medium">Total Tasks</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.tasks.total}</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-6">
                {/* Milestone Status Chart */}
                <div className="bg-dark-900 border border-dark-600 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Milestone Progress</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={milestoneData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Task Status Pie Chart */}
                <div className="bg-dark-900 border border-dark-600 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Task Distribution</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={taskData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {taskData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#6b7280'} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Weekly Effort Trend */}
                {analytics.weeklyEffort.length > 0 && (
                    <div className="col-span-2 bg-dark-900 border border-dark-600 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4">Weekly Effort Trend (Last 8 Weeks)</h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={analytics.weeklyEffort}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="week"
                                    stroke="#9ca3af"
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis stroke="#9ca3af" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value) => [`${value} hours`, 'Effort']}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="hours"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3b82f6', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectAnalyticsCharts;
