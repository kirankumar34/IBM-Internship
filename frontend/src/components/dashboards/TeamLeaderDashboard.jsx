import { useState, useEffect } from 'react';
import api from '../../context/api';
import { CheckSquare, UserPlus, ListTodo, PlusCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const TeamLeaderDashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [team, setTeam] = useState([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', project: '', assignedTo: '', priority: 'Medium' });

    useEffect(() => {
        const loadData = async () => {
            const results = await Promise.allSettled([
                api.get('/projects'),
                api.get('/tasks'),
                api.get('/users')
            ]);
            const [p, t, u] = results;

            if (p.status === 'fulfilled') setProjects(p.value.data);
            if (t.status === 'fulfilled') setTasks(t.value.data);
            if (u.status === 'fulfilled') setTeam(u.value.data.filter(user => user.role === 'team_member'));
        };
        loadData();
    }, []);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tasks', newTask);
            toast.success('Task Assigned');
            setShowTaskModal(false);
            // Refresh
            const updated = await api.get('/tasks');
            setTasks(updated.data);
        } catch (err) { toast.error('Creation failed'); }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Team Operations</h1>
                    <p className="text-dark-500">Coordinate tasks and manage team performance.</p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => setShowTaskModal(true)} className="bg-primary hover:bg-primary-hover text-dark-900 px-6 py-3 rounded-2xl font-bold flex items-center transition">
                        <PlusCircle size={18} className="mr-2" /> Delegate Task
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-dark-700 rounded-3xl border border-dark-600 p-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                        <ListTodo size={20} className="mr-2 text-primary" /> Task Tracking
                    </h3>
                    <div className="space-y-4">
                        {tasks.map(t => (
                            <div key={t._id} className="p-5 bg-dark-800 rounded-2xl border border-dark-600 flex items-center justify-between group hover:border-dark-500 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <div className={`p-2 rounded-lg ${t.status === 'Completed' ? 'bg-green-500/10 text-green-500' : 'bg-dark-600 text-dark-400'}`}>
                                        <CheckSquare size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold">{t.title}</h4>
                                        <p className="text-[10px] text-dark-500 uppercase font-mono">Assigned to: {t.assignedTo?.name || 'Unassigned'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${t.priority === 'High' ? 'bg-red-500/20 text-red-500' : 'bg-dark-600 text-dark-400'}`}>
                                        {t.priority}
                                    </span>
                                    <span className="text-xs text-white font-bold">{t.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-dark-700 p-6 rounded-3xl border border-dark-600">
                        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                        <a href="/register" className="flex items-center space-x-3 p-3 bg-dark-800 rounded-xl hover:bg-dark-600 transition text-dark-500 hover:text-white mb-3">
                            <UserPlus size={18} />
                            <span className="text-xs font-bold">Add Developer</span>
                        </a>
                    </div>
                </div>
            </div>

            {showTaskModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleCreateTask} className="bg-dark-700 rounded-3xl border border-dark-600 max-w-lg w-full p-8 space-y-4">
                        <h2 className="text-2xl font-bold text-white mb-2">Delegate New Task</h2>
                        <input className="w-full bg-dark-800 border-none rounded-2xl py-4 px-6 text-white" placeholder="Task Title" onChange={e => setNewTask({ ...newTask, title: e.target.value })} required />

                        <label className="text-xs text-dark-500 font-bold ml-2">Select Project</label>
                        <select
                            className="w-full bg-dark-800 border-none rounded-2xl p-4 text-white"
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
                            onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                            required
                            disabled={!newTask.project}
                        >
                            <option value="">{newTask.project ? "Choose Member" : "Select Project First"}</option>
                            {/* Dynamically filter members based on selected project */}
                            {newTask.project && projects.find(p => p._id === newTask.project)?.members
                                .filter(m => m.role === 'team_member') // STRICT FILTER: Only Team Members
                                .map(m => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                ))
                            }
                        </select>

                        <div className="flex justify-end space-x-4 pt-4">
                            <button type="button" onClick={() => setShowTaskModal(false)} className="text-dark-500 font-bold">Cancel</button>
                            <button type="submit" className="bg-primary text-dark-900 px-8 py-3 rounded-2xl font-bold">Assign Task</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default TeamLeaderDashboard;
