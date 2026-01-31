import React, { useState, useEffect, useContext } from 'react';
import api from '../context/api';
import AuthContext from '../context/AuthContext';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, Users, Briefcase, CheckCircle2, Shield, Activity, Clock } from 'lucide-react';
import LoginActivityTable from '../components/admin/LoginActivityTable';

const Analytics = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGlobalStats();
    }, [user]);

    const fetchGlobalStats = async () => {
        try {
            const res = await api.get('/analytics/global');
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch global stats:', err);
        } finally {
            setLoading(false);
        }
    };

    // Role based scoping is handled by the backend
    if (!['super_admin', 'project_admin', 'project_manager', 'team_leader'].includes(user?.role)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10">
                <div className="w-20 h-20 bg-danger/10 rounded-3xl flex items-center justify-center text-danger mb-6">
                    <Shield size={40} />
                </div>
                <h2 className="text-3xl font-black text-white mb-2">Restricted Access</h2>
                <p className="text-dark-400 max-w-md">Analytics are reserved for management roles. Please contact your administrator if you believe this is an error.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-10 text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-dark-400 font-bold uppercase tracking-widest text-xs">Aggregating Global Intelligence...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-10 text-center bg-dark-800 rounded-3xl border border-dark-700">
                <Shield size={48} className="mx-auto text-dark-500 mb-4 opacity-30" />
                <h2 className="text-xl font-bold text-white mb-2">Intelligence Offline</h2>
                <p className="text-dark-400 mb-6">Unable to retrieve global system metrics at this time.</p>
                <button
                    onClick={fetchGlobalStats}
                    className="px-6 py-2 bg-primary text-dark-900 font-bold rounded-xl hover:bg-primary-hover transition"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    const COLORS = ['#D1F366', '#3b82f6', '#f59e0b', '#ef4444'];

    const chartData = stats && stats.projectStatus ? [
        { name: 'Active', value: stats.projectStatus.active || 0 },
        { name: 'Completed', value: stats.projectStatus.completed || 0 },
        { name: 'On Hold', value: stats.projectStatus.onHold || 0 }
    ] : [];

    const metrics = [
        { label: 'Total Projects', value: stats.totalProjects || 0, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Total Effort (Hrs)', value: stats.totalHours || 0, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Avg. Completion Rate', value: `${stats.avgCompletionRate || 0}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        { label: 'Milestones', value: stats.milestoneStats ? `${stats.milestoneStats.completed || 0}/${stats.milestoneStats.total || 0}` : '0/0', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Enterprise Analytics</h1>
                    <p className="text-dark-300 font-bold mt-1 uppercase tracking-widest text-[10px]">Global Project & Resource Performance</p>
                </div>
                <div className="flex items-center space-x-3 bg-dark-800 p-2 rounded-2xl border border-dark-700">
                    <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-dark-900">
                        <Activity size={20} />
                    </div>
                    <div className="pr-4">
                        <p className="text-[10px] text-dark-500 font-black uppercase">System Status</p>
                        <p className="text-xs text-white font-bold flex items-center">
                            <span className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse"></span>
                            Operational
                        </p>
                    </div>
                </div>
            </div>

            {/* Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((m, i) => (
                    <div key={i} className="bg-dark-800/50 border border-dark-700/50 rounded-3xl p-6 transition hover:border-primary/30">
                        <div className={`w-12 h-12 ${m.bg} ${m.color} rounded-2xl flex items-center justify-center mb-4`}>
                            <m.icon size={24} />
                        </div>
                        <p className="text-dark-300 text-[10px] font-black uppercase tracking-widest mb-1">{m.label}</p>
                        <p className="text-3xl font-black text-white">{m.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Project Status Chart */}
                <div className="lg:col-span-1 bg-dark-800/30 border border-dark-700/50 rounded-[2.5rem] p-8">
                    <h3 className="text-xl font-bold text-white mb-8">Project Ecosystem</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#111111',
                                        border: '1px solid #333',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                    }}
                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                    labelStyle={{ display: 'none' }} // Pie charts don't really need the label in tooltip
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value) => <span className="text-dark-300 text-xs font-bold">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Future Global Trend Placeholder */}
                {/* Global Trend Chart */}
                <div className="lg:col-span-2 bg-dark-800/30 border border-dark-700/50 rounded-[2.5rem] p-8">
                    <h3 className="text-xl font-bold text-white mb-6">Global Development Velocity (Last 8 Weeks)</h3>
                    <div className="h-64">
                        {stats.globalWeeklyEffort && stats.globalWeeklyEffort.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.globalWeeklyEffort}>
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#374151', opacity: 0.2 }}
                                        contentStyle={{
                                            backgroundColor: '#111827',
                                            border: '1px solid #374151',
                                            borderRadius: '12px',
                                            padding: '12px'
                                        }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Activity className="text-dark-600 mb-2 opacity-20" size={48} />
                                <p className="text-dark-500 text-sm">No approved time logs found for this period.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Global Access Log - Super Admin Only */}
            {user?.role === 'super_admin' && (
                <div className="pt-10 border-t border-dark-700">
                    <div className="flex items-center space-x-3 mb-8">
                        <Shield className="text-primary" size={24} />
                        <h2 className="text-2xl font-black text-white">Access Continuity Log</h2>
                    </div>
                    <LoginActivityTable />
                </div>
            )}
        </div>
    );
};

export default Analytics;
