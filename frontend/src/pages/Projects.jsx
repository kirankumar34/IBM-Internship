import { useState, useEffect } from 'react';
import api from '../context/api';
import { toast } from 'react-toastify';
import {
    Plus,
    Search,
    MoreVertical,
    Calendar,
    Filter,
    Archive,
    Trophy,
    ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [filter, setFilter] = useState('Active');
    const [search, setSearch] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [pms, setPms] = useState([]);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        priority: 'Medium',
        templateId: '',
        primaryPmId: '',
        assistantPmId: ''
    });

    useEffect(() => {
        fetchProjects();
        fetchTemplates();
        fetchPMs();
    }, [filter, showArchived]);

    const fetchProjects = async () => {
        try {
            const res = await api.get(`/projects?archived=${showArchived}`);
            if (Array.isArray(res.data)) {
                setProjects(res.data);
            } else {
                setProjects([]);
            }
        } catch (err) {
            toast.error('Failed to load projects');
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/templates');
            setTemplates(res.data);
        } catch (err) { }
    };

    const fetchPMs = async () => {
        try {
            const res = await api.get('/users');
            setPms(res.data.filter(u => u.role === 'project_manager'));
        } catch (err) {
            console.error('Failed to load PMs');
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!formData.primaryPmId) {
            toast.error('Primary Project Manager is required');
            return;
        }
        try {
            await api.post('/projects', formData);
            toast.success('Project created successfully');
            setShowModal(false);
            fetchProjects();
            setFormData({
                name: '',
                description: '',
                startDate: '',
                endDate: '',
                priority: 'Medium',
                templateId: '',
                primaryPmId: '',
                assistantPmId: ''
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create project');
        }
    };

    const filteredProjects = Array.isArray(projects) ? projects.filter(p => {
        const matchesStatus = filter === 'All' || p.status === filter;
        // Safe check for name
        const matchesSearch = p.name ? p.name.toLowerCase().includes(search.toLowerCase()) : false;
        return matchesStatus && matchesSearch;
    }) : [];

    // Re-enabled for Super Admin as per Module 5 requirements
    const canCreate = user?.role === 'super_admin';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2">Projects</h1>
                    <p className="text-dark-500">Manage and track your organization's projects</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 w-4 h-4 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="bg-dark-800 border border-dark-600 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-dark-500 w-full md:w-72 transition-all outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-primary hover:bg-primary-hover text-dark-900 px-6 py-3 rounded-2xl text-sm font-black flex items-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                        >
                            <Plus size={18} className="mr-2" strokeWidth={3} /> New Project
                        </button>
                    )}
                </div>
            </div>

            {/* Filters & Tabs */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-dark-700">
                <div className="flex space-x-8 overflow-x-auto w-full no-scrollbar">
                    {['Active', 'On Hold', 'Completed', 'All'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`text-sm font-bold pb-4 border-b-2 transition whitespace-nowrap ${filter === f
                                ? 'border-primary text-primary'
                                : 'border-transparent text-dark-500 hover:text-white'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="flex items-center space-x-4 pb-4">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-xl transition-all
                            ${showArchived ? 'bg-warning text-dark-900' : 'bg-dark-800 text-dark-400 hover:text-white'}`}
                    >
                        <Archive size={14} />
                        <span>{showArchived ? 'Viewing Archived' : 'View Archived'}</span>
                    </button>
                </div>
            </div>

            {/* Project Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredProjects.map((project) => (
                    <div
                        key={project._id}
                        onClick={() => navigate(`/projects/${project._id}`)}
                        className="bg-dark-700 rounded-[2.5rem] border border-dark-600 p-8 hover:border-primary/50 transition-all group cursor-pointer relative overflow-hidden"
                    >
                        {/* Status/Priority Tags */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                    ${project.status === 'Active' ? 'bg-primary/10 text-primary' :
                                        project.status === 'Completed' ? 'bg-success/10 text-success' :
                                            'bg-warning/10 text-warning'}`}>
                                    {project.status}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-dark-800 text-dark-400`}>
                                    {project.priority}
                                </span>
                            </div>
                            <div className="text-dark-500 group-hover:text-primary transition-colors">
                                <ArrowRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-white mb-3 group-hover:text-primary transition-colors leading-tight">
                            {project.name}
                        </h3>
                        <p className="text-dark-500 text-sm mb-8 line-clamp-2 min-h-[2.5rem]">
                            {project.description}
                        </p>

                        <div className="space-y-6">
                            {/* Progress */}
                            <div>
                                <div className="flex items-center justify-between text-xs font-black mb-2">
                                    <span className="text-dark-500 uppercase tracking-widest">Progress</span>
                                    <span className="text-white">{project.progress || 0}%</span>
                                </div>
                                <div className="w-full bg-dark-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-primary h-full transition-all duration-700"
                                        style={{ width: `${project.progress || 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-6 border-t border-dark-600/50">
                                <div className="flex -space-x-3 group/members">
                                    {/* Primary PM */}
                                    {project.owner && (
                                        <div title={`PM: ${project.owner.name}`} className="w-9 h-9 rounded-full bg-primary border-4 border-dark-700 flex items-center justify-center text-[10px] text-dark-900 font-black shadow-lg relative z-30 ring-2 ring-primary/20">
                                            {project.owner.name.charAt(0)}
                                        </div>
                                    )}
                                    {/* Assistant PM */}
                                    {project.assistantPm && (
                                        <div title={`APM: ${project.assistantPm.name}`} className="w-9 h-9 rounded-full bg-purple-500 border-4 border-dark-700 flex items-center justify-center text-[10px] text-white font-black shadow-lg relative z-20 ring-2 ring-purple-500/20">
                                            {project.assistantPm.name.charAt(0)}
                                        </div>
                                    )}
                                    {/* Members Limit 3 */}
                                    {(project.members || []).slice(0, 3).map((m, i) => (
                                        <div key={i} title={m.name} className="w-9 h-9 rounded-full bg-dark-600 border-4 border-dark-700 flex items-center justify-center text-[10px] text-white font-black shadow-lg relative z-10 transition-transform group-hover/members:translate-x-1">
                                            {m.name.charAt(0)}
                                        </div>
                                    ))}
                                    {/* Remaining Count */}
                                    {(project.members && project.members.length > 3) && (
                                        <div className="w-9 h-9 rounded-full bg-dark-800 border-4 border-dark-700 flex items-center justify-center text-[10px] text-dark-400 font-black shadow-lg relative z-0">
                                            +{project.members.length - 3}
                                        </div>
                                    )}
                                    {(!project.owner && (!project.members || project.members.length === 0)) && (
                                        <div className="w-9 h-9 rounded-full bg-dark-600 border-4 border-dark-700 flex items-center justify-center text-[10px] text-dark-400 font-bold">?</div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center text-[10px] text-dark-400 font-black uppercase tracking-widest mb-1">
                                        <Calendar size={12} className="mr-1.5 text-primary" />
                                        {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No date'}
                                    </div>
                                    <div className="text-[8px] text-dark-600 font-bold uppercase tracking-widest">
                                        {(project.members?.length || 0) + (project.owner ? 1 : 0) + (project.assistantPm ? 1 : 0)} Enrolled
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hover Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    </div>
                ))}
            </div>

            {filteredProjects.length === 0 && (
                <div className="text-center py-32 bg-dark-700/50 rounded-[3rem] border-2 border-dashed border-dark-600">
                    <div className="bg-dark-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Filter size={32} className="text-dark-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No projects found</h3>
                    <p className="text-dark-500">Try adjusting your filters or search terms.</p>
                </div>
            )}

            {/* Create Project Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/90 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                    <div className="bg-dark-700 w-full max-w-2xl rounded-[2.5rem] border border-dark-600 p-10 overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white">Create New Project</h2>
                                <p className="text-dark-500 text-sm">Design the future of your organization</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-dark-500 hover:text-white transition p-2">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProject} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black text-dark-400 uppercase tracking-widest ml-1">Project Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary/20 placeholder-dark-600"
                                        placeholder="e.g. Website Redesign"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black text-dark-400 uppercase tracking-widest ml-1">Description</label>
                                    <textarea
                                        className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary/20 placeholder-dark-600 min-h-[100px]"
                                        placeholder="Tell us about this project..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-dark-400 uppercase tracking-widest ml-1">Start Date</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary/20"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-dark-400 uppercase tracking-widest ml-1">End Date</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary/20"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-dark-400 uppercase tracking-widest ml-1">Priority</label>
                                    <select
                                        className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary/20 appearance-none"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-dark-400 uppercase tracking-widest ml-1">Template (Optional)</label>
                                    <select
                                        className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary/20 appearance-none"
                                        value={formData.templateId}
                                        onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                                    >
                                        <option value="">No Template</option>
                                        {templates.map(t => (
                                            <option key={t._id} value={t._id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-dark-400 uppercase tracking-widest ml-1 text-primary">Primary PM *</label>
                                    <select
                                        required
                                        className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary/20 appearance-none"
                                        value={formData.primaryPmId}
                                        onChange={(e) => setFormData({ ...formData, primaryPmId: e.target.value })}
                                    >
                                        <option value="">Select Primary PM</option>
                                        {pms.map(pm => (
                                            <option key={pm._id} value={pm._id}>{pm.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-dark-400 uppercase tracking-widest ml-1">Assistant PM</label>
                                    <select
                                        className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary/20 appearance-none"
                                        value={formData.assistantPmId}
                                        onChange={(e) => setFormData({ ...formData, assistantPmId: e.target.value })}
                                    >
                                        <option value="">No Assistant PM</option>
                                        {pms.filter(pm => pm._id !== formData.primaryPmId).map(pm => (
                                            <option key={pm._id} value={pm._id}>{pm.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary-hover text-dark-900 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg mt-4"
                            >
                                Launch Project
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
