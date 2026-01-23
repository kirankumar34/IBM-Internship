import { useState, useEffect } from 'react';
import api from '../../context/api';
import { Users, Briefcase, TrendingUp, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, projects: 0, pmCount: 0 });

    useEffect(() => {
        const fetchGlobalStats = async () => {
            // In a real app, dedicated endpoint. For now, we use existing ones
            const [u, p] = await Promise.all([api.get('/users'), api.get('/projects')]);
            setStats({
                users: u.data.length,
                projects: p.data.length,
                pmCount: u.data.filter(user => user.role === 'project_manager').length
            });
        };
        fetchGlobalStats();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">System Overview</h1>
                    <p className="text-dark-500">Global control panel for system administration.</p>
                </div>
                <Link to="/register" className="bg-primary hover:bg-primary-hover text-dark-900 px-6 py-3 rounded-2xl font-bold flex items-center transition shadow-lg">
                    <UserPlus size={18} className="mr-2" /> Create Manager
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-primary' },
                    { label: 'Total Projects', value: stats.projects, icon: Briefcase, color: 'text-blue-400' },
                    { label: 'Project Managers', value: stats.pmCount, icon: TrendingUp, color: 'text-green-400' },
                ].map((stat, i) => (
                    <div key={i} className="bg-dark-700 p-8 rounded-3xl border border-dark-600 shadow-xl">
                        <div className={`p-3 rounded-xl bg-dark-800 w-fit mb-4 ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <h3 className="text-dark-500 text-sm font-medium">{stat.label}</h3>
                        <p className="text-4xl font-extrabold text-white mt-2">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* System Log / Activity would go here */}
            <div className="bg-dark-700 rounded-3xl border border-dark-600 p-8">
                <h3 className="text-xl font-bold text-white mb-6">Recent Deployments</h3>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-4 bg-dark-800 rounded-2xl border border-dark-600">
                            <div className="flex items-center space-x-4">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                <span className="text-white font-medium text-sm">System Update v1.{i}.0</span>
                            </div>
                            <span className="text-dark-500 text-xs font-mono">2026-01-2{i}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
