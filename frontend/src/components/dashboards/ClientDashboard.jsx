import { useState, useEffect } from 'react';
import api from '../../context/api';
import { Eye, Shield, BarChart3, Clock } from 'lucide-react';

const ClientDashboard = () => {
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const fetchViewOnly = async () => {
            const res = await api.get('/projects');
            setProjects(res.data);
        };
        fetchViewOnly();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Project Oversight</h1>
                    <p className="text-dark-500">View real-time progress and milestones for your investments.</p>
                </div>
                <div className="flex items-center bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl text-xs font-bold border border-blue-500/20">
                    <Shield size={14} className="mr-2" /> Read-Only Access
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map(p => (
                    <div key={p._id} className="bg-dark-700 p-8 rounded-3xl border border-dark-600 space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <BarChart3 size={64} />
                        </div>

                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-white pr-10">{p.name}</h3>
                            <div className="bg-dark-800 p-2 rounded-lg text-dark-500"><Eye size={18} /></div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-dark-500 uppercase tracking-widest">Progress Metrics</span>
                                <span className="text-primary font-bold">1/1 Tasks Complete</span>
                            </div>
                            <div className="w-full bg-dark-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dark-600">
                            <div className="flex items-center text-dark-500">
                                <Clock size={14} className="mr-2" />
                                <span className="text-xs">Est. Delivery: {new Date(p.endDate).toLocaleDateString()}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-primary font-bold uppercase tracking-widest px-2 py-0.5 bg-primary/10 rounded-full">{p.status}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClientDashboard;
