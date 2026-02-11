import { useState, useEffect } from 'react';
import api from '../context/api';
import {
    Mail,
    Phone,
    MoreHorizontal,
    Plus,
    X,
    UserPlus,
    Shield,
    User,
    ArrowRight,
    Edit3,
    Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Team = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New Member Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: 'password123', // Default for now
        role: '' // Will be set in useEffect
    });

    // Update role when modal opens or user changes
    useEffect(() => {
        const roles = getAllowedRoles();
        if (roles.length > 0 && !formData.role) {
            setFormData(prev => ({ ...prev, role: roles[0] }));
        }
    }, [currentUser, showModal]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            // Backend now provides taskStats, so we use it directly
            setUsers(res.data);
            setLoading(false);
        } catch (err) {
            toast.error('Failed to load team members');
            setLoading(false);
        }
    };

    const handleCreateMember = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users', formData);
            toast.success('Member added successfully');
            setShowModal(false);
            setFormData({ name: '', email: '', password: 'password123', role: 'employee' });
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add member');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('Member removed');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        }
    };

    const handleApproval = async (id, action) => {
        try {
            await api.put(`/users/${id}/approve`, { action });
            toast.success(`User ${action}d successfully`);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${action}`);
        }
    };

    const pendingUsers = users.filter(u => u.approvalStatus === 'pending');
    const activeUsers = users.filter(u => u.approvalStatus === 'approved');

    // Role Hierarchy Logic for "Add Member" options
    const getAllowedRoles = () => {
        const roles = {
            'super_admin': ['project_manager'],
            'project_manager': ['team_leader'],
            'team_leader': ['team_member']
        };
        return roles[currentUser.role] || [];
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            'super_admin': 'bg-primary text-dark-900',
            'project_manager': 'bg-purple-500 text-white',
            'team_leader': 'bg-orange-500 text-white',
            'team_member': 'bg-dark-500 text-white',
            'client': 'bg-blue-500 text-white'
        };
        return colors[role] || 'bg-dark-400 text-white';
    };

    if (loading) return <div className="animate-pulse space-y-4 pt-10 text-center text-dark-400">Loading Team...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Team Management</h1>
                    <p className="text-dark-400 text-sm mt-1">Manage organization hierarchy and member assignments.</p>
                </div>
                {['super_admin', 'project_admin', 'project_manager', 'team_lead'].includes(currentUser.role) && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-primary hover:bg-primary-hover text-dark-900 px-6 py-3 rounded-2xl font-black flex items-center transition shadow-lg shadow-primary/20"
                    >
                        <UserPlus size={18} className="mr-2" /> Add Member
                    </button>
                )}
            </div>

            {/* Pending Approvals Section */}
            {pendingUsers.length > 0 && (
                <div className="mb-10">
                    <h2 className="text-xl font-bold text-yellow-500 mb-4 flex items-center">
                        <Shield className="mr-2" /> Pending Approvals
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingUsers.map(user => (
                            <div key={user._id} className="bg-dark-700/80 border border-yellow-500/30 p-6 rounded-3xl flex flex-col relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                                    Needs Approval
                                </div>
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-bold text-lg mr-4">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{user.name}</h3>
                                        <p className="text-xs text-dark-400">Requesting: {user.requestedRole?.replace('_', ' ') || user.role}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-dark-400 mb-6">
                                    <p className="flex items-center"><Mail size={12} className="mr-2" /> {user.email}</p>
                                    <p className="mt-1 flex items-center"><User size={12} className="mr-2" /> Login ID: {user.loginId || user.email}</p>
                                </div>
                                <div className="flex space-x-3 mt-auto">
                                    <button
                                        onClick={() => handleApproval(user._id, 'approve')}
                                        className="flex-1 bg-primary text-dark-900 font-bold py-2 rounded-xl hover:bg-primary-hover transition text-sm"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleApproval(user._id, 'reject')}
                                        className="flex-1 bg-dark-800 text-dark-400 font-bold py-2 rounded-xl hover:text-white transition text-sm border border-dark-600"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeUsers.map((user) => (
                    <div key={user._id} className="bg-dark-700/50 rounded-3xl border border-dark-600 p-6 flex flex-col group hover:border-primary/50 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">


                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-dark-600 to-dark-800 flex items-center justify-center text-xl font-black text-primary mb-4 border border-dark-600 group-hover:scale-110 transition-transform">
                            {user.name.charAt(0)}
                        </div>

                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{user.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${getRoleBadgeColor(user.role)}`}>
                                    {user.role.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Reports To - Always Visible */}
                            {user.reportsTo && (
                                <div className="mt-2 text-[11px] bg-dark-800/50 text-dark-300 px-2 py-1 rounded-lg border border-dark-600 flex items-center w-fit">
                                    <Shield size={10} className="mr-1 text-primary" /> Reports to: <span className="font-bold text-white ml-1">{user.reportsTo.name}</span>
                                </div>
                            )}
                            {!user.reportsTo && user.role !== 'super_admin' && (
                                <div className="mt-2 text-[11px] bg-orange-500/10 text-orange-400 px-2 py-1 rounded-lg border border-orange-500/20 flex items-center w-fit">
                                    <Shield size={10} className="mr-1" /> Not assigned to manager
                                </div>
                            )}
                        </div>

                        {/* Task Status Summary */}
                        {user.taskStats && (
                            <div className="mb-4 p-3 bg-dark-800/50 rounded-xl border border-dark-600">
                                <div className="text-[10px] font-black text-dark-400 uppercase tracking-widest mb-2">Assigned Tasks</div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl font-black text-white">{user.taskStats.total || 0}</span>
                                    <div className="flex gap-1">
                                        {user.taskStats.completed > 0 && (
                                            <span className="text-[9px] bg-success/20 text-success px-1.5 py-0.5 rounded font-bold">
                                                ✓ {user.taskStats.completed}
                                            </span>
                                        )}
                                        {user.taskStats.inProgress > 0 && (
                                            <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                                                ⟳ {user.taskStats.inProgress}
                                            </span>
                                        )}
                                        {user.taskStats.blocked > 0 && (
                                            <span className="text-[9px] bg-danger/20 text-danger px-1.5 py-0.5 rounded font-bold">
                                                ⊘ {user.taskStats.blocked}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full bg-dark-900 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="bg-success h-full transition-all"
                                        style={{ width: `${user.taskStats.total > 0 ? (user.taskStats.completed / user.taskStats.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 mt-auto">
                            <div className="flex items-center text-xs text-dark-400">
                                <Mail size={14} className="mr-2 opacity-50" /> {user.email}
                            </div>

                            <div className="flex space-x-2 pt-4 border-t border-dark-600/50">
                                <button className="flex-1 bg-dark-800 hover:bg-dark-600 p-2.5 rounded-xl text-dark-400 hover:text-white transition flex items-center justify-center border border-dark-600">
                                    <Edit3 size={16} />
                                </button>
                                {currentUser.role === 'super_admin' && (
                                    <button
                                        onClick={() => handleDelete(user._id)}
                                        className="flex-1 bg-danger/10 hover:bg-danger/20 p-2.5 rounded-xl text-danger transition flex items-center justify-center border border-danger/20"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button className="flex-1 bg-dark-800 hover:bg-dark-600 p-2.5 rounded-xl text-dark-400 hover:text-white transition flex items-center justify-center border border-dark-600">
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Member Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/90 backdrop-blur-md animate-in fade-in">
                    <div className="bg-dark-700 w-full max-w-md rounded-[2.5rem] border border-dark-600 p-10 shadow-3xl shadow-primary/5">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white">Join the Team</h2>
                                <p className="text-dark-400 text-xs">Add a new member to the organization hierarchy.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-dark-800 p-2 rounded-full text-dark-500 hover:text-white transition">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateMember} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-dark-400 uppercase tracking-widest pl-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" size={18} />
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-dark-800 border-2 border-dark-600 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-primary focus:outline-none transition-colors"
                                        placeholder="Enter name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-dark-400 uppercase tracking-widest pl-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" size={18} />
                                    <input
                                        required
                                        type="email"
                                        className="w-full bg-dark-800 border-2 border-dark-600 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-primary focus:outline-none transition-colors"
                                        placeholder="email@company.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-dark-400 uppercase tracking-widest pl-1">Designated Role</label>
                                <div className="relative">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" size={18} />
                                    <select
                                        className="w-full bg-dark-800 border-2 border-dark-600 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        {getAllowedRoles().map(role => (
                                            <option key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-[10px] text-dark-500 italic pl-1">Hierarchy: You can only assign roles below yours.</p>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary-hover text-dark-900 font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-1 active:translate-y-0"
                            >
                                Provision Member
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Team;
