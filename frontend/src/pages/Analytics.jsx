import React, { useState, useEffect, useContext } from 'react';
import api from '../context/api';
import AuthContext from '../context/AuthContext';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, CartesianGrid, XAxis, YAxis
} from 'recharts';
import {
    Briefcase,
    CheckCircle2,
    Clock,
    Activity,
    TrendingUp,
    Shield,
    Search,
    Bell,
    MoreHorizontal,
    ArrowUpRight,
    PlayCircle,
    PauseCircle,
    CheckCircle,
    LogIn,
    LogOut,
    Download
} from 'lucide-react';
import { toast } from 'react-toastify';

const Analytics = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [loginLogs, setLoginLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, logsRes] = await Promise.all([
                api.get('/analytics/global'),
                user.role === 'super_admin' ? api.get('/analytics/login-activity?limit=20') : Promise.resolve({ data: { activities: [] } })
            ]);

            setStats(statsRes.data);
            setLoginLogs(logsRes.data.activities || []);
        } catch (err) {
            console.error('Analytics Data Error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!['super_admin', 'project_admin', 'project_manager', 'team_leader'].includes(user?.role)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10 bg-dark-900 rounded-3xl">
                <Shield size={48} className="text-dark-500 mb-6 opacity-50" />
                <h2 className="text-2xl font-bold text-white mb-2">Restricted Access</h2>
                <p className="text-dark-400">Analytics are reserved for management roles.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] bg-transparent">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-primary font-mono text-xs uppercase tracking-[0.2em]">Processing Analytics...</p>
            </div>
        );
    }

    if (!stats) return null;

    // Data Prep
    const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const projectStatusData = [
        { name: 'Active', value: stats.projectStatus?.active || 0 },
        { name: 'Completed', value: stats.projectStatus?.completed || 0 },
        { name: 'On Hold', value: stats.projectStatus?.onHold || 0 }
    ].filter(d => d.value > 0);

    const handleExport = async (type) => {
        try {
            toast.info(`Generating ${type} report...`);
            const response = await api.get(`/reports/${type}/export`, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Download started');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export report');
        }
    };

    return (
        <div className="min-h-screen bg-transparent text-white space-y-8 animate-in fade-in duration-500 pb-10">

            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Analytics Dashboard</h1>
                    <p className="text-dark-400 text-sm font-medium mt-1">Overview of project performance and resource utilization</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Visual Search Bar */}
                    <div className="hidden md:flex items-center bg-dark-800 border border-dark-700 px-4 py-3 rounded-xl w-64">
                        <Search size={18} className="text-dark-400 mr-2" />
                        <span className="text-sm text-dark-500">Search metrics...</span>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex gap-2">
                        <button onClick={() => handleExport('projects')} className="bg-dark-800 hover:bg-dark-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center border border-dark-700 transition shadow-sm" title="Export Projects CSV">
                            <Download size={14} className="mr-2 text-blue-500" /> Projects
                        </button>
                        <button onClick={() => handleExport('tasks')} className="bg-dark-800 hover:bg-dark-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center border border-dark-700 transition shadow-sm" title="Export Tasks CSV">
                            <Download size={14} className="mr-2 text-purple-500" /> Tasks
                        </button>
                    </div>
                    {/* Status Icons */}
                    <div className="p-3 bg-dark-800 border border-dark-700 rounded-xl relative">
                        <Bell size={20} className="text-dark-300" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-dark-800"></span>
                    </div>
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm font-bold flex items-center">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                        Live System
                    </div>
                </div>
            </div>

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Metric 1 - Total Projects */}
                <div className="bg-dark-800/40 border border-dark-700 rounded-2xl p-6 hover:bg-dark-800 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <Briefcase size={20} />
                        </div>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center border border-emerald-500/20">
                            <ArrowUpRight size={12} className="mr-1" /> +12%
                        </span>
                    </div>
                    <p className="text-dark-400 text-xs font-bold uppercase tracking-wider mb-1">Total Projects</p>
                    <h3 className="text-3xl font-black text-white">{stats.totalProjects}</h3>
                </div>

                {/* Metric 2 - Total Effort */}
                <div className="bg-dark-800/40 border border-dark-700 rounded-2xl p-6 hover:bg-dark-800 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            <Clock size={20} />
                        </div>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center border border-emerald-500/20">
                            <ArrowUpRight size={12} className="mr-1" /> +5.4%
                        </span>
                    </div>
                    <p className="text-dark-400 text-xs font-bold uppercase tracking-wider mb-1">Total Effort</p>
                    <h3 className="text-3xl font-black text-white">{stats.totalHours?.toFixed(0) || 0}<span className="text-lg text-dark-500 ml-1">h</span></h3>
                </div>

                {/* Metric 3 - Completion Rate */}
                <div className="bg-dark-800/40 border border-dark-700 rounded-2xl p-6 hover:bg-dark-800 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <p className="text-dark-400 text-xs font-bold uppercase tracking-wider mb-1">Completion Rate</p>
                    <h3 className="text-3xl font-black text-white">{stats.avgCompletionRate}%</h3>
                </div>

                {/* Metric 4 - Milestones */}
                <div className="bg-dark-800/40 border border-dark-700 rounded-2xl p-6 hover:bg-dark-800 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                    <p className="text-dark-400 text-xs font-bold uppercase tracking-wider mb-1">Milestones</p>
                    <h3 className="text-3xl font-black text-white">
                        {stats.milestoneStats?.completed}
                        <span className="text-dark-600 text-lg mx-1">/</span>
                        <span className="text-lg text-dark-500">{stats.milestoneStats?.total}</span>
                    </h3>
                </div>
            </div>

            {/* 3. Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Trend Chart */}
                <div className="lg:col-span-2 bg-dark-800/40 border border-dark-700 rounded-3xl p-8 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white">Development Velocity</h3>
                            <p className="text-dark-400 text-xs mt-1">Weekly effort contribution trend</p>
                        </div>
                        <div className="p-2 bg-dark-700 rounded-lg text-dark-400 hover:text-white cursor-pointer">
                            <MoreHorizontal size={20} />
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        {stats.globalWeeklyEffort?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.globalWeeklyEffort}>
                                    <defs>
                                        <linearGradient id="colorEffort" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', borderRadius: '12px', border: '1px solid #374151', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)', color: '#fff' }}
                                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorEffort)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-dark-500">
                                <Activity size={32} className="mb-2 opacity-50" />
                                <p className="text-xs font-medium">No trend data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Donut */}
                <div className="bg-dark-800/40 border border-dark-700 rounded-3xl p-8 backdrop-blur-sm flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-2">Project Ecosystem</h3>
                    <p className="text-dark-400 text-xs mb-8">Status breakdown</p>

                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={projectStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {projectStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderRadius: '12px', border: '1px solid #374151', color: '#fff' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-dark-300 text-xs font-bold ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8 text-white">
                            <span className="text-3xl font-black">{stats.totalProjects}</span>
                            <span className="text-[10px] uppercase font-bold text-dark-500 tracking-wider">Total</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Activity Log - Card Style (Dark) */}
            {user?.role === 'super_admin' && (
                <div className="bg-dark-800/40 border border-dark-700 rounded-3xl p-8 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white">Recent System Activity</h3>
                            <p className="text-dark-400 text-xs mt-1">Real-time access logs and security events</p>
                        </div>
                        <button className="text-sm font-bold text-primary hover:text-primary-hover">View All</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loginLogs.slice(0, 6).map((log, idx) => (
                            <div key={log._id || idx} className="p-4 rounded-2xl border border-dark-700 bg-dark-900/50 hover:border-dark-600 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                            {log.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{log.user?.name}</p>
                                            <p className="text-[10px] font-bold text-dark-400 uppercase">{log.user?.role?.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${log.logoutTime ? 'bg-dark-600' : 'bg-emerald-500 animate-pulse'}`}></div>
                                </div>
                                <div className="space-y-2 mt-4 pt-4 border-t border-dark-700">
                                    <div className="flex items-center text-xs text-dark-400 font-medium">
                                        <LogIn size={12} className="mr-2 text-emerald-500" />
                                        {new Date(log.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                    </div>
                                    {log.logoutTime ? (
                                        <div className="flex items-center text-xs text-dark-500">
                                            <LogOut size={12} className="mr-2 text-dark-500" />
                                            {new Date(log.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-xs text-blue-400 font-bold bg-blue-500/10 w-fit px-2 py-1 rounded-md border border-blue-500/20">
                                            Active Session
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {loginLogs.length === 0 && (
                        <div className="text-center py-10 text-dark-500 text-sm">No activity logs found.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Analytics;
