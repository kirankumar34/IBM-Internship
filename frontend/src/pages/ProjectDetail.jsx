import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../context/api';
import { toast } from 'react-toastify';
import TaskBoard from '../components/TaskBoard';
import CommentSection from '../components/collaboration/CommentSection';
import FileUpload from '../components/collaboration/FileUpload';
import DiscussionBoard from '../components/collaboration/DiscussionBoard';
import ProjectAnalyticsCharts from '../components/admin/ProjectAnalyticsCharts';
import WeeklyTimesheetView from '../components/time/WeeklyTimesheetView';
import EmployeeActivityView from '../components/admin/EmployeeActivityView';
import TimesheetAnalytics from '../components/admin/TimesheetAnalytics';
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
    Edit,
    LayoutGrid,
    ListTodo,
    X,
    Shield,
    MessageCircle,
    Files,
    Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [milestones, setMilestones] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    // Modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [allUsers, setAllUsers] = useState([]);

    const [memberForm, setMemberForm] = useState({ userId: '', roleAs: 'member' });
    const [milestoneForm, setMilestoneForm] = useState({ name: '', description: '', dueDate: '' });
    const [editForm, setEditForm] = useState({ name: '', description: '', status: '', priority: '' });

    // PM Edit State
    const [showPmEditModal, setShowPmEditModal] = useState(false);
    const [pmEditForm, setPmEditForm] = useState({ primaryPmId: '', assistantPmId: '' });

    const fetchData = async () => {
        try {
            const res = await api.get(`/projects/${id}`);
            setProject(res.data);
            setMilestones(res.data.milestones || []);
            setEditForm({
                name: res.data.name,
                description: res.data.description,
                status: res.data.status,
                priority: res.data.priority
            });
            setPmEditForm({
                primaryPmId: res.data.owner?._id || '',
                assistantPmId: res.data.assistantPm?._id || ''
            });
            setLoading(false);
        } catch (err) {
            toast.error('Failed to load project details');
            navigate('/projects');
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setAllUsers(res.data);
        } catch (err) { }
    };

    useEffect(() => {
        fetchData();
        fetchUsers();
    }, [id]);

    const handleToggleMilestone = async (mId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
            await api.put(`/projects/milestones/${mId}`, { status: newStatus });
            fetchData();
            toast.success('Milestone updated');
        } catch (err) {
            toast.error('Failed to update milestone');
        }
    };

    const handleArchive = async () => {
        try {
            await api.patch(`/projects/${id}/archive`);
            toast.success(project.isArchived ? 'Project restored' : 'Project archived');
            fetchData();
        } catch (err) {
            toast.error('Action failed');
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/projects/${id}/members`, memberForm);
            toast.success('Member added');
            setShowMemberModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add member');
        }
    };

    const handleAddMilestone = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/projects/${id}/milestones`, milestoneForm);
            toast.success('Milestone created');
            setShowMilestoneModal(false);
            setMilestoneForm({ name: '', description: '', dueDate: '' });
            fetchData();
        } catch (err) {
            toast.error('Failed to create milestone');
        }
    };

    const handleEditProject = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/projects/${id}`, editForm);
            toast.success('Project updated');
            setShowEditModal(false);
            fetchData();
        } catch (err) {
            toast.error('Failed to update project');
        }
    };

    const handleDeleteProject = async () => {
        if (!window.confirm('PERMANENTLY DELETE this project? This cannot be undone.')) return;
        try {
            await api.delete(`/projects/${id}`);
            toast.success('Project deleted');
            navigate('/projects');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleUpdateManagers = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/projects/${id}/managers`, pmEditForm);
            toast.success('Project Managers updated successfully');
            setShowPmEditModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update managers');
        }
    };

    const handleDownloadReport = async () => {
        try {
            toast.info('Generating PDF report...');
            // Using direct axios call for blob handling
            const token = localStorage.getItem('token');
            const response = await api.get(`/analytics/project/${id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Project_Report_${project.name}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Report downloaded successfully');
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Failed to generate report');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-dark-500 animate-pulse">Loading project details...</div>;

    const canManage = user.role === 'super_admin' || user.role === 'project_admin' || (user.role === 'project_manager' && project.owner?._id === user.id);

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
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="p-2 text-dark-500 hover:text-white hover:bg-dark-700 rounded-lg transition"
                                title="Edit Project"
                            >
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
                                <button
                                    onClick={handleDeleteProject}
                                    className="p-2 text-dark-500 hover:text-danger hover:bg-danger/10 rounded-lg transition"
                                    title="Permanently Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Warning Banner for PA/SA if no PM */}
            {(!project.owner) && (user.role === 'super_admin' || user.role === 'project_admin') && (
                <div className="bg-warning/10 border border-warning/20 text-warning p-4 rounded-2xl flex items-center animate-in fade-in slide-in-from-top-4">
                    <div className="mr-3 p-2 bg-warning/20 rounded-full">
                        <Users size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">Missing Project Manager</h4>
                        <p className="text-xs opacity-80 mt-1">This project needs a Primary Project Manager assigned to become fully active.</p>
                    </div>
                    <button
                        onClick={() => setShowPmEditModal(true)}
                        className="ml-auto bg-warning text-dark-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white transition"
                    >
                        Assign Now
                    </button>
                </div>
            )}

            <div className="bg-dark-700 rounded-[2.5rem] p-8 border border-dark-600 shadow-2xl relative overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                        ${project.status === 'Active' ? 'bg-primary/10 text-primary' :
                            project.status === 'Completed' ? 'bg-success/10 text-success' :
                                'bg-warning/10 text-warning'}`}>
                        {project.status}
                    </span>
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                        ${project.priority === 'High' ? 'bg-danger/10 text-danger' :
                            project.priority === 'Medium' ? 'bg-warning/10 text-warning' :
                                'bg-dark-500/10 text-dark-400'}`}>
                        {project.priority} Priority
                    </span>
                    {project.isArchived && (
                        <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-warning text-dark-900">
                            Archived
                        </span>
                    )}
                </div>

                <h1 className="text-5xl font-black text-white mb-4 tracking-tight">{project.name}</h1>
                <p className="text-dark-400 text-lg leading-relaxed mb-10 max-w-3xl">
                    {project.description}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-1">
                        <span className="text-[10px] text-dark-500 uppercase font-black tracking-widest">Start Date</span>
                        <div className="flex items-center text-white font-bold">
                            <Calendar size={14} className="mr-2 text-primary" />
                            {new Date(project.startDate).toLocaleDateString()}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] text-dark-500 uppercase font-black tracking-widest">End Date</span>
                        <div className="flex items-center text-white font-bold">
                            <Clock size={14} className="mr-2 text-warning" />
                            {new Date(project.endDate).toLocaleDateString()}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] text-dark-500 uppercase font-black tracking-widest">Project Managers</span>
                        <div className="space-y-1">
                            {/* Primary PM */}
                            <div className="flex items-center text-white font-bold">
                                <Users size={14} className="mr-2 text-blue-400" />
                                <span className="mr-2">{project.owner?.name || 'Vacant'}</span>
                                <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Primary</span>
                            </div>
                            {/* Assistant PM */}
                            {project.assistantPm && (
                                <div className="flex items-center text-white font-bold animate-in fade-in slide-in-from-left-2 duration-500">
                                    <Users size={14} className="mr-2 text-purple-400" />
                                    <span className="mr-2">{project.assistantPm.name}</span>
                                    <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Assistant</span>
                                </div>
                            )}
                        </div>
                        {/* Edit Managers Button: Super Admin & Project Admin */}
                        {(user.role === 'super_admin' || user.role === 'project_admin') && (
                            <button
                                onClick={() => setShowPmEditModal(true)}
                                className="mt-2 text-[10px] flex items-center bg-dark-800 hover:bg-dark-600 text-dark-400 hover:text-white px-2 py-1 rounded-lg transition border border-dark-600"
                            >
                                <Edit size={10} className="mr-1" /> Edit Managers
                            </button>
                        )}
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] text-dark-500 uppercase font-black tracking-widest">Overall Progress</span>
                        <div className="flex items-center text-white font-black text-xl">
                            <Trophy size={16} className="mr-2 text-success" />
                            {project.progress}%
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-10">
                    <div className="w-full bg-dark-800 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-primary h-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] transition-all duration-1000 ease-out"
                            style={{ width: `${project.progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
            </div>

            {/* Tabs & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-1.5 bg-dark-800/50 p-1.5 rounded-2xl border border-dark-600">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${activeTab === 'overview' ? 'bg-dark-700 text-white shadow-xl' : 'text-dark-400 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${activeTab === 'tasks' ? 'bg-dark-700 text-white shadow-xl' : 'text-dark-400 hover:text-white'}`}
                    >
                        Tasks Board
                    </button>
                    <button
                        onClick={() => setActiveTab('collaboration')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${activeTab === 'collaboration' ? 'bg-dark-700 text-white shadow-xl' : 'text-dark-400 hover:text-white'}`}
                    >
                        Collaboration
                    </button>
                    <button
                        onClick={() => setActiveTab('time')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${activeTab === 'time' ? 'bg-dark-700 text-white shadow-xl' : 'text-dark-400 hover:text-white'}`}
                    >
                        Time Tracking
                    </button>
                    {(user?.role === 'super_admin' || user?.role === 'project_manager' || user?.role === 'team_leader') && (
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                ${activeTab === 'analytics' ? 'bg-dark-700 text-white shadow-xl' : 'text-dark-400 hover:text-white'}`}
                        >
                            Analytics
                        </button>
                    )}
                </div>

                {(user?.role === 'super_admin' || user?.role === 'project_manager') && (
                    <button
                        onClick={handleDownloadReport}
                        className="flex items-center space-x-2 bg-dark-700 hover:bg-dark-600 text-white px-6 py-3 rounded-2xl border border-dark-600 font-black text-[10px] uppercase tracking-widest transition group"
                    >
                        <Download size={16} className="text-primary group-hover:scale-110 transition" />
                        <span>Download Progress Report</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {activeTab === 'overview' && (
                    <>
                        {/* Main Info */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Milestones Timeline */}
                            <div className="bg-dark-700 rounded-[2rem] p-8 border border-dark-600 shadow-xl">
                                <div className="flex items-center justify-between mb-10">
                                    <h2 className="text-2xl font-black text-white flex items-center">
                                        <Trophy size={24} className="mr-3 text-primary" />
                                        Milestones
                                    </h2>
                                    {/* Milestone Creation: PA & PM Only (SA focuses on PM assignment) */}
                                    {(user.role === 'project_admin' || (user.role === 'project_manager' && project.owner._id === user.id)) && (
                                        <button
                                            onClick={() => setShowMilestoneModal(true)}
                                            className="bg-dark-800 hover:bg-dark-600 text-white p-3 rounded-xl transition border border-dark-600"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    )}
                                </div>

                                {milestones && milestones.length > 0 ? (
                                    <div className="space-y-10 relative">
                                        <div className="absolute left-7 top-4 bottom-4 w-1 bg-gradient-to-b from-primary/50 to-dark-600 rounded-full"></div>

                                        {milestones.map((m) => (
                                            <div key={m._id} className="relative pl-20 group">
                                                <button
                                                    onClick={() => canManage && handleToggleMilestone(m._id, m.status)}
                                                    className={`absolute left-3.5 top-1.5 w-8 h-8 rounded-full border-4 border-dark-700 z-10 flex items-center justify-center transition-all duration-500
                                                        ${m.status === 'Completed' ? 'bg-success text-dark-900 scale-125 shadow-lg shadow-success/20' : 'bg-dark-600 text-dark-500 group-hover:bg-primary group-hover:text-dark-900 group-hover:scale-110'}
                                                        ${!canManage ? 'cursor-default' : 'cursor-pointer'}`}
                                                >
                                                    {m.status === 'Completed' ? <CheckCircle2 size={14} strokeWidth={4} /> : <Circle size={10} strokeWidth={4} />}
                                                </button>

                                                <div className={`p-6 rounded-[1.5rem] border-2 transition-all duration-300
                                                    ${m.status === 'Completed' ? 'bg-dark-800/30 border-success/10 grayscale' : 'bg-dark-800/80 border-dark-600 group-hover:border-primary/20 shadow-lg'}`}>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h3 className={`text-lg font-black transition ${m.status === 'Completed' ? 'text-dark-500 line-through' : 'text-white'}`}>
                                                            {m.name}
                                                        </h3>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-dark-500 bg-dark-900 px-3 py-1 rounded-full">
                                                            {new Date(m.dueDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-dark-500 leading-relaxed font-medium">{m.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 border-2 border-dashed border-dark-600 rounded-3xl">
                                        <Trophy size={48} className="mx-auto text-dark-600 mb-4 opacity-20" />
                                        <p className="text-dark-500 font-bold uppercase tracking-widest text-xs">No milestones defined.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Info */}
                        <div className="space-y-8">
                            {/* Team Members */}
                            <div className="bg-dark-700 rounded-[2rem] p-8 border border-dark-600 shadow-xl">
                                <h3 className="text-lg font-black text-white mb-6 flex items-center uppercase tracking-widest">
                                    <Users size={20} className="mr-3 text-primary" />
                                    Project Leads
                                </h3>
                                <div className="space-y-4">
                                    {/* Project Managers Section */}
                                    <div className="space-y-3 mb-6">
                                        <p className="text-[10px] font-black text-dark-500 uppercase tracking-tighter">Project Managers</p>

                                        {/* Primary PM */}
                                        {project?.owner && (
                                            <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/30 rounded-2xl group hover:bg-primary/20 transition">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-dark-900 font-black shadow-lg shadow-primary/20">
                                                        {project.owner.name.charAt(0)}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-black text-white">{project.owner.name}</div>
                                                        <div className="text-[10px] text-primary/70 font-black uppercase tracking-widest">PRIMARY</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Assistant PM */}
                                        {project?.assistantPm && (
                                            <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl group hover:bg-purple-500/20 transition">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white font-black shadow-lg shadow-purple-500/20">
                                                        {project.assistantPm.name.charAt(0)}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-black text-white">{project.assistantPm.name}</div>
                                                        <div className="text-[10px] text-purple-400 font-black uppercase tracking-widest">ASSISTANT</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Team Leads Section */}
                                    {project?.teamLeads && project.teamLeads.length > 0 && (
                                        <div className="space-y-3 mb-6">
                                            <p className="text-[10px] font-black text-dark-500 uppercase tracking-tighter">Team Leads</p>
                                            {project.teamLeads.map(lead => (
                                                <div key={lead._id} className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl group hover:bg-primary/10 transition">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-dark-900 font-black shadow-lg shadow-primary/20">
                                                            {lead.name.charAt(0)}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-black text-white">{lead.name}</div>
                                                            <div className="text-[10px] text-primary/70 font-black uppercase tracking-widest">Team Lead</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-[10px] font-black text-dark-500 uppercase tracking-tighter">Members</p>
                                    {project?.members && project.members.map(member => (
                                        <div key={member._id} className="flex items-center justify-between p-4 bg-dark-800 rounded-2xl border border-dark-600 hover:border-dark-500 transition">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-xl bg-dark-600 flex items-center justify-center text-white font-black shadow-lg">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-black text-white">{member.name}</div>
                                                    <div className="text-[10px] text-dark-500 font-black uppercase tracking-widest">{member.role.replace('_', ' ')}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {canManage && (
                                        <button
                                            onClick={() => setShowMemberModal(true)}
                                            className="w-full py-4 border-2 border-dashed border-dark-600 rounded-2xl text-dark-500 hover:text-white hover:border-primary/50 transition font-black text-sm uppercase tracking-widest flex items-center justify-center"
                                        >
                                            <Plus size={16} className="mr-2" /> Assign User
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Activity Feed */}
                            <div className="bg-dark-700 rounded-[2rem] p-8 border border-dark-600 shadow-xl">
                                <h3 className="text-lg font-black text-white mb-6 flex items-center uppercase tracking-widest">
                                    <Clock size={20} className="mr-3 text-warning" />
                                    Activity Stream
                                </h3>
                                <div className="space-y-8 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                                    {project?.activities && project.activities.length > 0 ? (
                                        project.activities.map((activity, i) => (
                                            <div key={i} className="relative pl-8 border-l border-dark-600">
                                                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-dark-700"></div>
                                                <div className="text-sm font-black text-white mb-1 tracking-tight">{activity.action}</div>
                                                <div className="text-xs text-dark-500 mb-2 leading-relaxed">{activity.details}</div>
                                                <div className="flex items-center text-[10px] text-dark-600 font-bold uppercase tracking-wider">
                                                    {new Date(activity.createdAt).toLocaleDateString()} • {activity.user?.name || 'Automated'}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-xs text-dark-600 font-bold uppercase tracking-widest">No activity data.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'tasks' && (
                    <div className="lg:col-span-3 animate-in fade-in zoom-in duration-500">
                        <TaskBoard projectId={project._id} members={[...(project.members || []), ...(project.teamLeads || [])]} />
                    </div>
                )}

                {activeTab === 'collaboration' && (
                    <div className="lg:col-span-3 space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-500">
                        {/* Discussion Board */}
                        <DiscussionBoard projectId={project._id} />

                        {/* Comments and Files */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <CommentSection projectId={project._id} />
                            <FileUpload projectId={project._id} />
                        </div>
                    </div>
                )}

                {activeTab === 'time' && (
                    <div className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-10 duration-500">
                        <WeeklyTimesheetView />
                    </div>
                )}

                {activeTab === 'analytics' && user?.role === 'super_admin' && (
                    <div className="lg:col-span-3 space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-500">
                        <ProjectAnalyticsCharts projectId={project._id} />
                        <EmployeeActivityView projectId={project._id} />
                        <TimesheetAnalytics projectId={project._id} />
                    </div>
                )}
            </div>

            {/* Modals Container */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-900/95 backdrop-blur-md animate-in fade-in">
                    <div className="bg-dark-700 w-full max-w-xl rounded-[3rem] border border-dark-600 p-10">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-3xl font-black text-white">Refine Project</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-dark-500 hover:text-white"><X size={32} /></button>
                        </div>
                        <form onSubmit={handleEditProject} className="space-y-6">
                            <input
                                className="w-full bg-dark-800 border-none rounded-2xl p-5 text-white focus:ring-2 focus:ring-primary h-16 font-bold"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder="Project Title"
                            />
                            <textarea
                                className="w-full bg-dark-800 border-none rounded-2xl p-5 text-white focus:ring-2 focus:ring-primary h-32"
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="Description"
                            />
                            <div className="grid grid-cols-2 gap-6">
                                <select
                                    className="bg-dark-800 rounded-2xl p-5 text-white font-bold h-16 border-none appearance-none"
                                    value={editForm.status}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                >
                                    <option>Active</option>
                                    <option>On Hold</option>
                                    <option>Completed</option>
                                </select>
                                <select
                                    className="bg-dark-800 rounded-2xl p-5 text-white font-bold h-16 border-none appearance-none"
                                    value={editForm.priority}
                                    onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                                >
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-dark-900 h-20 rounded-3xl font-black text-xl shadow-2xl shadow-primary/20">Apply Changes</button>
                        </form>
                    </div>
                </div>
            )}

            {showMemberModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-900/95 backdrop-blur-md">
                    <div className="bg-dark-700 w-full max-w-lg rounded-[3rem] border border-dark-600 p-10">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Assign Force</h2>
                            <button onClick={() => setShowMemberModal(false)} className="text-dark-500 hover:text-white"><X size={32} /></button>
                        </div>
                        <form onSubmit={handleAddMember} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-2">Select Personnel</label>
                                <select
                                    className="w-full bg-dark-800 border-none rounded-2xl p-5 text-white font-bold h-16"
                                    value={memberForm.userId}
                                    onChange={e => setMemberForm({ ...memberForm, userId: e.target.value })}
                                    required
                                >
                                    <option value="">Choose User...</option>
                                    {allUsers
                                        .filter(u => {
                                            // Super Admin & PA Strict Rule: Show ONLY Project Managers in dropdown
                                            if (user.role === 'super_admin' || user.role === 'project_admin') {
                                                return u.role === 'project_manager';
                                            }
                                            // PM Rule: Show ONLY Team Leaders
                                            if (user.role === 'project_manager') {
                                                return u.role === 'team_leader';
                                            }
                                            return true;
                                        })
                                        .map(u => (
                                            <option key={u._id} value={u._id}>
                                                {u.name}
                                                {(user.role === 'super_admin' || user.role === 'project_admin') && u.role === 'project_manager'
                                                    ? ` - ${u.specialization || 'General'} Project Manager`
                                                    : ` (${u.role.replace('_', ' ')})`}
                                            </option>
                                        ))}
                                </select>
                                {(user.role === 'super_admin' || user.role === 'project_admin') && (
                                    <p className="text-[10px] text-dark-500 pt-1 italic">* Restricting list to Project Managers only.</p>
                                )}
                                {user.role === 'project_manager' && (
                                    <p className="text-[10px] text-dark-500 pt-1 italic">* Restricting list to Team Leaders only.</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-2">Assign As</label>
                                <select
                                    className="w-full bg-dark-800 border-none rounded-2xl p-5 text-white font-bold h-16"
                                    value={memberForm.roleAs}
                                    onChange={e => setMemberForm({ ...memberForm, roleAs: e.target.value })}
                                >
                                    {/* PMs can only assign Team Leaders */}
                                    {user.role === 'project_manager' ? (
                                        <option value="team_leader">Team Lead</option>
                                    ) : (
                                        <>
                                            <option value="member">Standard Member</option>
                                            <option value="team_lead">Team Lead</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-dark-900 h-20 rounded-3xl font-black text-xl">Deploy to Project</button>
                        </form>
                    </div>
                </div>
            )}

            {showMilestoneModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-900/95 backdrop-blur-md">
                    <div className="bg-dark-700 w-full max-w-xl rounded-[3rem] border border-dark-600 p-10">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-white">Create Milestone</h2>
                            <button onClick={() => setShowMilestoneModal(false)} className="text-dark-500 hover:text-white"><X size={32} /></button>
                        </div>
                        <form onSubmit={handleAddMilestone} className="space-y-6">
                            <input
                                required
                                className="w-full bg-dark-800 border-none rounded-2xl p-5 text-white font-bold h-16"
                                placeholder="Milestone Name"
                                value={milestoneForm.name}
                                onChange={e => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                            />
                            <textarea
                                className="w-full bg-dark-800 border-none rounded-2xl p-5 text-white h-32"
                                placeholder="Milestone Description"
                                value={milestoneForm.description}
                                onChange={e => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                            />
                            <input
                                required
                                type="date"
                                className="w-full bg-dark-800 border-none rounded-2xl p-5 text-white h-16 font-black"
                                value={milestoneForm.dueDate}
                                onChange={e => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                            />
                            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-dark-900 h-20 rounded-3xl font-black text-xl">Establish Milestone</button>
                        </form>
                    </div>
                </div>
            )}

            {/* PM Edit Modal */}
            {showPmEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-900/95 backdrop-blur-md animate-in fade-in">
                    <div className="bg-dark-700 w-full max-w-lg rounded-[3rem] border border-dark-600 p-10">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Edit Managers</h2>
                            <button onClick={() => setShowPmEditModal(false)} className="text-dark-500 hover:text-white"><X size={32} /></button>
                        </div>
                        <form onSubmit={handleUpdateManagers} className="space-y-6">
                            <div className="p-4 bg-warning/5 border border-warning/10 rounded-2xl mb-6">
                                <div className="flex items-start">
                                    <AlertCircle size={16} className="text-warning mt-1 mr-2 flex-shrink-0" />
                                    <p className="text-xs text-warning/80 leading-relaxed font-bold">
                                        Changing Project Managers will be logged in the activity audit trail.
                                        Primary PM is mandatory.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-2">Primary Project Manager <span className="text-danger">*</span></label>
                                <select
                                    required
                                    className="w-full bg-dark-800 border-none rounded-2xl p-5 text-white font-bold h-16 focus:ring-2 focus:ring-primary"
                                    value={pmEditForm.primaryPmId}
                                    onChange={e => setPmEditForm({ ...pmEditForm, primaryPmId: e.target.value })}
                                >
                                    <option value="">Select Primary PM</option>
                                    {allUsers.filter(u => u.role === 'project_manager').map(u => (
                                        <option key={u._id} value={u._id} disabled={u._id === pmEditForm.assistantPmId}>
                                            {u.name} - {u.specialization || 'General'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-2">Assistant Project Manager (Optional)</label>
                                <select
                                    className="w-full bg-dark-800 border-none rounded-2xl p-5 text-white font-bold h-16 focus:ring-2 focus:ring-primary"
                                    value={pmEditForm.assistantPmId}
                                    onChange={e => setPmEditForm({ ...pmEditForm, assistantPmId: e.target.value })}
                                >
                                    <option value="">None</option>
                                    {allUsers.filter(u => u.role === 'project_manager').map(u => (
                                        <option key={u._id} value={u._id} disabled={u._id === pmEditForm.primaryPmId}>
                                            {u.name} - {u.specialization || 'General'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary-hover text-dark-900 h-20 rounded-3xl font-black text-xl shadow-2xl shadow-primary/20 mt-4"
                                disabled={!pmEditForm.primaryPmId || pmEditForm.primaryPmId === pmEditForm.assistantPmId}
                            >
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;
