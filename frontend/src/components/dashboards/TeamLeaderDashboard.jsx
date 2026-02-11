import { useState, useEffect, useContext } from 'react';
import api from '../../context/api';
import { CheckSquare, UserPlus, ListTodo, PlusCircle, Shield } from 'lucide-react';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';

const TeamLeaderDashboard = () => {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [team, setTeam] = useState([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', project: '', assignedTo: '', priority: 'Medium' });
    const [stats, setStats] = useState({
        toDo: 0,
        inProgress: 0,
        blocked: 0,
        completed: 0,
        total: 0
    });

    const loadData = async () => {
        try {
            const results = await Promise.allSettled([
                api.get('/projects'),
                api.get('/tasks'),
                api.get('/users')
            ]);
            const [p, t, u] = results;

            if (p.status === 'fulfilled') setProjects(p.value.data);
            if (t.status === 'fulfilled') {
                const tData = t.value.data;
                setTasks(tData);
                setStats({
                    toDo: tData.filter(x => x.status === 'To Do').length,
                    inProgress: tData.filter(x => x.status === 'In Progress').length,
                    blocked: tData.filter(x => x.status === 'Blocked').length,
                    completed: tData.filter(x => x.status === 'Completed').length,
                    total: tData.length
                });
            }
            if (u.status === 'fulfilled') setTeam(u.value.data.filter(u => u.role === 'team_member'));
        } catch (err) {
            console.error("Dashboard Load Error", err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleStatusUpdate = async (taskId, newStatus, blockedReason = '') => {
        try {
            await api.patch(`/tasks/${taskId}/status`, { status: newStatus, blockedReason });
            toast.success(`Status updated to ${newStatus}`);
            loadData(); // Refresh all data
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tasks', newTask);
            toast.success('Task Assigned');
            setShowTaskModal(false);
            loadData();
            setNewTask({ title: '', project: '', assignedTo: '', priority: 'Medium' });
        } catch (err) { toast.error('Creation failed'); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Team Operations</h1>
                    <p className="text-dark-400 font-medium">Coordinate tasks and manage team performance.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={() => setShowTaskModal(true)} className="bg-primary hover:bg-primary-hover text-dark-900 px-6 py-3 rounded-2xl font-black flex items-center transition shadow-lg shadow-primary/20">
                        <PlusCircle size={18} className="mr-2" /> Delegate Task
                    </button>
                </div>
            </div>

            {/* Task Status Breakdown Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-dark-700/50 p-6 rounded-2xl border border-dark-600">
                    <p className="text-[10px] font-black text-dark-400 uppercase tracking-widest mb-1">Total</p>
                    <h4 className="text-2xl font-black text-white">{stats.total}</h4>
                </div>
                <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">In Progress</p>
                    <h4 className="text-2xl font-black text-blue-400">{stats.inProgress}</h4>
                </div>
                <div className="bg-success/10 p-6 rounded-2xl border border-success/20">
                    <p className="text-[10px] font-black text-success uppercase tracking-widest mb-1">Completed</p>
                    <h4 className="text-2xl font-black text-success">{stats.completed}</h4>
                </div>
                <div className="bg-danger/10 p-6 rounded-2xl border border-danger/20">
                    <p className="text-[10px] font-black text-danger uppercase tracking-widest mb-1">Blocked</p>
                    <h4 className="text-2xl font-black text-danger">{stats.blocked}</h4>
                </div>
                <div className="bg-dark-800/50 p-6 rounded-2xl border border-dark-600">
                    <p className="text-[10px] font-black text-dark-400 uppercase tracking-widest mb-1">Pending</p>
                    <h4 className="text-2xl font-black text-white">{stats.toDo}</h4>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    {/* Task Tracking List */}
                    <div className="bg-dark-700/30 rounded-3xl border border-dark-600 p-8 backdrop-blur-sm">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                            <ListTodo size={20} className="mr-2 text-primary" /> Task Tracking
                        </h3>
                        <div className="space-y-4">
                            {tasks.map(t => (
                                <div key={t._id} className="p-5 bg-dark-800/40 rounded-2xl border border-dark-700 flex flex-col md:flex-row md:items-center justify-between group hover:border-dark-600 transition-all">
                                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                                        <div className={`p-3 rounded-xl ${t.status === 'Completed' ? 'bg-success/20 text-success' :
                                            t.status === 'Blocked' ? 'bg-danger/20 text-danger' :
                                                t.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-700 text-dark-400'}`}>
                                            <CheckSquare size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg">{t.title}</h4>
                                            <div className="flex items-center mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mr-3 ${t.priority === 'High' ? 'bg-danger/20 text-danger' : 'bg-dark-600 text-dark-400'}`}>
                                                    {t.priority}
                                                </span>
                                                <p className="text-[11px] text-dark-400 font-medium">Assigned to: <span className="text-white font-bold">{t.assignedTo?.name || 'Unassigned'}</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end space-x-4">
                                        {/* Quick Status Control */}
                                        <div className="flex gap-2 mr-4">
                                            {t.status === 'To Do' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(t._id, 'In Progress')}
                                                    className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase rounded-lg border border-blue-500/30 transition-all"
                                                >
                                                    Take
                                                </button>
                                            )}
                                            {t.status === 'In Progress' && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusUpdate(t._id, 'Completed')}
                                                        className="px-3 py-1.5 bg-success/10 hover:bg-success/20 text-success text-[10px] font-black uppercase rounded-lg border border-success/30 transition-all"
                                                    >
                                                        Complete
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const reason = prompt("Describe the issue/blocker:");
                                                            if (reason) handleStatusUpdate(t._id, 'Blocked', reason);
                                                        }}
                                                        className="px-3 py-1.5 bg-danger/10 hover:bg-danger/20 text-danger text-[10px] font-black uppercase rounded-lg border border-danger/30 transition-all"
                                                    >
                                                        Issue
                                                    </button>
                                                </>
                                            )}
                                            {t.status === 'Blocked' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(t._id, 'In Progress')}
                                                    className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase rounded-lg border border-blue-500/30 transition-all"
                                                >
                                                    Resume
                                                </button>
                                            )}
                                        </div>

                                        <div className={`px-4 py-2 rounded-xl text-xs font-bold ${t.status === 'Completed' ? 'bg-success/10 text-success' : t.status === 'Blocked' ? 'bg-danger/10 text-danger' : 'bg-dark-800 text-white'}`}>
                                            {t.status}
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-dark-600 flex items-center justify-center text-[10px] font-black text-white border border-dark-500 shadow-lg">
                                            {t.assignedTo?.name?.charAt(0) || '?'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Reporting Hierarchy Section */}
                    <div className="bg-dark-700/30 p-8 rounded-3xl border border-dark-600">
                        <h3 className="text-lg font-bold text-white mb-6">Reporting & Teams</h3>

                        {/* Manager */}
                        <div className="mb-8">
                            <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest mb-3">Your Manager</p>
                            <div className="p-4 bg-dark-800 rounded-2xl border border-dark-700 flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-inner">
                                    <Shield size={18} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-white font-bold text-sm truncate">{user?.reportsTo?.name || 'Project Manager'}</p>
                                    <p className="text-[10px] text-dark-500 font-bold uppercase tracking-tighter">Direct Superior</p>
                                </div>
                            </div>
                        </div>

                        {/* Direct Reports Count */}
                        <div>
                            <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest mb-3">Your Team</p>
                            <div className="p-6 bg-dark-800/80 rounded-3xl border border-primary/20 text-center relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:scale-110"></div>
                                <h4 className="text-4xl font-black text-primary mb-1">{team.length}</h4>
                                <p className="text-xs font-bold text-dark-300 uppercase tracking-wider">Developers</p>
                                <a href="/team" className="mt-4 block text-[10px] font-black text-primary hover:underline uppercase tracking-tighter">Manage Team</a>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-dark-700 to-dark-800 p-8 rounded-3xl border border-dark-600">
                        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <a href="/team" className="flex items-center space-x-3 p-4 bg-dark-900/50 rounded-2xl hover:bg-dark-600 transition group text-dark-300">
                                <div className="bg-dark-700 p-2 rounded-lg text-dark-400 group-hover:text-primary transition-colors">
                                    <UserPlus size={18} />
                                </div>
                                <span className="text-xs font-bold group-hover:text-white transition-colors">Team Roster</span>
                            </a>
                            <button onClick={() => setShowTaskModal(true)} className="w-full flex items-center space-x-3 p-4 bg-primary/10 rounded-2xl hover:bg-primary/20 transition group">
                                <div className="bg-primary/20 p-2 rounded-lg text-primary">
                                    <PlusCircle size={18} />
                                </div>
                                <span className="text-xs font-bold text-primary">Delegate Task</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showTaskModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleCreateTask} className="bg-dark-700 rounded-3xl border border-dark-600 max-w-lg w-full p-8 space-y-4">
                        <h2 className="text-2xl font-bold text-white mb-2">Delegate New Task</h2>
                        <input className="w-full bg-dark-800 border-none rounded-2xl py-4 px-6 text-white" placeholder="Task Title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} required />

                        <label className="text-xs text-dark-500 font-bold ml-2">Select Project</label>
                        <select
                            className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white"
                            value={newTask.project}
                            onChange={e => {
                                setNewTask({ ...newTask, project: e.target.value, assignedTo: '' }); // Reset assignee
                            }}
                            required
                        >
                            <option value="">Choose Project</option>
                            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>

                        <label className="text-xs text-dark-500 font-bold ml-2">Assign to Member</label>
                        <select
                            className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white"
                            value={newTask.assignedTo}
                            onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                            required
                            disabled={!newTask.project}
                        >
                            <option value="">{newTask.project ? "Choose Member" : "Select Project First"}</option>
                            {newTask.project && projects.find(p => p._id === newTask.project)?.members
                                .filter(m => m.role === 'team_member')
                                .map(m => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                ))
                            }
                        </select>

                        <div className="flex justify-end space-x-4 pt-4">
                            <button type="button" onClick={() => setShowTaskModal(false)} className="text-dark-500 font-bold underline transition-colors hover:text-white">Cancel</button>
                            <button type="submit" className="bg-primary text-dark-900 px-8 py-3 rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all">Assign Task</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default TeamLeaderDashboard;
