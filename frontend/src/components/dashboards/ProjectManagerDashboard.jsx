import { useState, useEffect } from 'react';
import api from '../../context/api';
import { FolderPlus, Users, Activity, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';

const ProjectManagerDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '', startDate: '', endDate: '' });

    const fetchProjects = async () => {
        const res = await api.get('/projects');
        setProjects(res.data);
    };

    useEffect(() => { fetchProjects(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects', newProject);
            toast.success('Project Created Successfully');
            setShowModal(false);
            fetchProjects();
        } catch (err) {
            toast.error('Failed to create project');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Project Strategy</h1>
                    <p className="text-dark-500">Oversee project lifecycles and roadmap execution.</p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary-hover text-dark-900 px-6 py-3 rounded-2xl font-bold flex items-center transition">
                        <FolderPlus size={18} className="mr-2" /> Start Project
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold text-white">Active Roadmap</h3>
                    {projects.map(p => (
                        <div key={p._id} className="bg-dark-700 p-6 rounded-3xl border border-dark-600 flex items-center justify-between group">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-2xl bg-dark-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold">{p.name}</h4>
                                    <p className="text-dark-500 text-xs truncate w-48">{p.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-6">
                                <div className="text-right">
                                    <p className="text-xs text-dark-500 uppercase font-bold tracking-tighter">Status</p>
                                    <p className="text-sm text-primary font-bold">{p.status}</p>
                                </div>
                                <button className="p-2 rounded-xl bg-dark-600 text-white hover:bg-primary hover:text-dark-900 transition">
                                    <ExternalLink size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {projects.length === 0 && <p className="text-dark-500 italic">No projects assigned yet.</p>}
                </div>

                <div className="bg-dark-700 p-8 rounded-3xl border border-dark-600 h-fit">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Management Actions</h3>
                    </div>
                    <div className="space-y-4">
                        <a href="/register" className="block p-4 bg-dark-800 rounded-2xl border border-dark-600 text-dark-400 hover:text-white hover:border-primary transition group">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-sm">Onboard Team Leader</span>
                                <Users size={14} className="group-hover:text-primary" />
                            </div>
                            <p className="text-[10px]">Grant access to the project lead portal.</p>
                        </a>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleCreate} className="bg-dark-700 rounded-3xl border border-dark-600 max-w-lg w-full p-8 space-y-4">
                        <h2 className="text-2xl font-bold text-white mb-2">New Strategic Project</h2>
                        <input className="w-full bg-dark-800 border-none rounded-2xl py-4 px-6 text-white outline-none ring-1 ring-dark-600 focus:ring-primary" placeholder="Project Name" onChange={e => setNewProject({ ...newProject, name: e.target.value })} required />
                        <textarea className="w-full bg-dark-800 border-none rounded-2xl py-4 px-6 text-white outline-none ring-1 ring-dark-600 focus:ring-primary" placeholder="Description" rows="4" onChange={e => setNewProject({ ...newProject, description: e.target.value })} required></textarea>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="date" className="bg-dark-800 border-none rounded-2xl p-4 text-white outline-none ring-1 ring-dark-600 focus:ring-primary" onChange={e => setNewProject({ ...newProject, startDate: e.target.value })} required />
                            <input type="date" className="bg-dark-800 border-none rounded-2xl p-4 text-white outline-none ring-1 ring-dark-600 focus:ring-primary" onChange={e => setNewProject({ ...newProject, endDate: e.target.value })} required />
                        </div>
                        <div className="flex justify-end space-x-4 pt-4">
                            <button type="button" onClick={() => setShowModal(false)} className="text-dark-500 font-bold">Cancel</button>
                            <button type="submit" className="bg-primary text-dark-900 px-8 py-3 rounded-2xl font-bold">Launch Project</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ProjectManagerDashboard;
