import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../context/api';
import { toast } from 'react-toastify';
import {
    Calendar,
    Users,
    Trophy,
    Clock,
    AlertCircle,
    ArrowLeft,
    MoreVertical,
    CheckCircle2,
    Circle,
    Plus,
    Archive,
    Trash2,
    Edit
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [milestones, setMilestones] = useState([]);

    useEffect(() => {
        const fetchProjectData = async () => {
            try {
                const res = await api.get(`/projects/${id}`);
                setProject(res.data);
                setMilestones(res.data.milestones || []);
                setLoading(false);
            } catch (err) {
                toast.error('Failed to load project details');
                navigate('/projects');
            }
        };
        fetchProjectData();
    }, [id, navigate]);

    const handleToggleMilestone = async (mId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
            await api.put(`/projects/milestones/${mId}`, { status: newStatus });

            // Refresh project data to update progress
            const res = await api.get(`/projects/${id}`);
            setProject(res.data);
            setMilestones(res.data.milestones);
            toast.success('Milestone updated');
        } catch (err) {
            toast.error('Failed to update milestone');
        }
    };

    const handleArchive = async () => {
        try {
            await api.patch(`/projects/${id}/archive`);
            toast.success(project.isArchived ? 'Project restored' : 'Project archived');
            navigate('/projects');
        } catch (err) {
            toast.error('Action failed');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-dark-500">Loading project detail...</div>;

    const canManage = user.role === 'super_admin' || user.role === 'project_admin' || (user.role === 'project_manager' && project.owner._id === user.id);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/projects')}
                    className="flex items-center text-dark-500 hover:text-white transition group"
                >
                    <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Projects
                </button>
                <div className="flex items-center space-x-3">
                    {canManage && (
                        <>
                            <button className="p-2 text-dark-500 hover:text-white hover:bg-dark-700 rounded-lg transition">
                                <Edit size={18} />
                            </button>
                            <button
                                onClick={handleArchive}
                                className="p-2 text-dark-500 hover:text-warning hover:bg-warning/10 rounded-lg transition"
                                title={project.isArchived ? "Restore" : "Archive"}
                            >
                                <Archive size={18} />
                            </button>
                            {user.role === 'super_admin' && (
                                <button className="p-2 text-dark-500 hover:text-danger hover:bg-danger/10 rounded-lg transition">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-dark-700 rounded-3xl p-8 border border-dark-600">
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                ${project.status === 'Active' ? 'bg-primary/10 text-primary' :
                                    project.status === 'Completed' ? 'bg-success/10 text-success' :
                                        'bg-warning/10 text-warning'}`}>
                                {project.status}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                ${project.priority === 'High' ? 'bg-danger/10 text-danger' :
                                    project.priority === 'Medium' ? 'bg-warning/10 text-warning' :
                                        'bg-dark-500/10 text-dark-400'}`}>
                                {project.priority} Priority
                            </span>
                        </div>

                        <h1 className="text-4xl font-black text-white mb-4">{project.name}</h1>
                        <p className="text-dark-400 text-lg leading-relaxed mb-8">
                            {project.description}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <span className="text-xs text-dark-500 uppercase font-bold tracking-widest">Start Date</span>
                                <div className="flex items-center text-white font-medium">
                                    <Calendar size={14} className="mr-2 text-primary" />
                                    {new Date(project.startDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-dark-500 uppercase font-bold tracking-widest">End Date</span>
                                <div className="flex items-center text-white font-medium">
                                    <Clock size={14} className="mr-2 text-warning" />
                                    {new Date(project.endDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-dark-500 uppercase font-bold tracking-widest">Owner</span>
                                <div className="flex items-center text-white font-medium">
                                    <Users size={14} className="mr-2 text-blue-400" />
                                    {project.owner.name}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-dark-500 uppercase font-bold tracking-widest">Progress</span>
                                <div className="flex items-center text-white font-black">
                                    <Trophy size={14} className="mr-2 text-success" />
                                    {project.progress}%
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-8">
                            <div className="w-full bg-dark-800 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all duration-1000 ease-out"
                                    style={{ width: `${project.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Milestones Timeline */}
                    <div className="bg-dark-700 rounded-3xl p-8 border border-dark-600">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-white flex items-center">
                                <Trophy size={24} className="mr-3 text-primary" />
                                Milestones
                            </h2>
                            {canManage && (
                                <button className="bg-dark-800 hover:bg-dark-600 text-white p-2 rounded-xl transition">
                                    <Plus size={20} />
                                </button>
                            )}
                        </div>

                        {milestones.length > 0 ? (
                            <div className="space-y-8 relative">
                                {/* Vertical Line */}
                                <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-dark-600"></div>

                                {milestones.map((m, idx) => (
                                    <div key={m._id} className="relative pl-16 group">
                                        {/* Node */}
                                        <button
                                            onClick={() => canManage && handleToggleMilestone(m._id, m.status)}
                                            className={`absolute left-2.5 top-1 w-7 h-7 rounded-full border-4 border-dark-700 z-10 flex items-center justify-center transition
                                                ${m.status === 'Completed' ? 'bg-success text-dark-900 scale-125' : 'bg-dark-600 text-dark-500 group-hover:bg-primary group-hover:text-dark-900'}
                                                ${!canManage ? 'cursor-default' : 'cursor-pointer'}`}
                                        >
                                            {m.status === 'Completed' ? <CheckCircle2 size={12} strokeWidth={4} /> : <Circle size={10} strokeWidth={4} />}
                                        </button>

                                        <div className={`p-5 rounded-2xl border transition
                                            ${m.status === 'Completed' ? 'bg-dark-800/50 border-success/20' : 'bg-dark-800 border-dark-600 group-hover:border-primary/30'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className={`font-bold transition ${m.status === 'Completed' ? 'text-dark-500 line-through' : 'text-white'}`}>
                                                    {m.name}
                                                </h3>
                                                <span className="text-xs font-mono text-dark-500">
                                                    Due: {new Date(m.dueDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-dark-500">{m.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-dark-500">
                                No milestones defined for this project.
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Team Members */}
                    <div className="bg-dark-700 rounded-3xl p-6 border border-dark-600">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                            <Users size={20} className="mr-2 text-primary" />
                            Team Members
                        </h3>
                        <div className="space-y-4">
                            {project.members && project.members.map(member => (
                                <div key={member._id} className="flex items-center justify-between p-3 bg-dark-800 rounded-xl">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-dark-900 font-bold mr-3 shadow-lg">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{member.name}</div>
                                            <div className="text-xs text-dark-500 capitalize">{member.role.replace('_', ' ')}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button className="w-full py-3 border-2 border-dashed border-dark-600 rounded-xl text-dark-500 hover:text-white hover:border-primary transition font-bold text-sm flex items-center justify-center">
                                <Plus size={16} className="mr-2" /> Add Member
                            </button>
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="bg-dark-700 rounded-3xl p-6 border border-dark-600">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                            <Clock size={20} className="mr-2 text-warning" />
                            Activity Log
                        </h3>
                        <div className="space-y-6">
                            {project.activities && project.activities.length > 0 ? (
                                project.activities.map((activity, i) => (
                                    <div key={i} className="relative pl-6">
                                        <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary/40"></div>
                                        <div className="text-xs font-bold text-white mb-1">{activity.action}</div>
                                        <div className="text-xs text-dark-500 mb-1">{activity.details}</div>
                                        <div className="text-[10px] text-dark-600 uppercase font-bold">
                                            {new Date(activity.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} • By {activity.user.name}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-xs text-dark-500">No activity logged yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;
