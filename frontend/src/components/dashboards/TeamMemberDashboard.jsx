import { useState, useEffect, useContext } from 'react';
import api from '../../context/api';
import AuthContext from '../../context/AuthContext';
import { CheckCircle, Clock, Play } from 'lucide-react';
import { toast } from 'react-toastify';

const TeamMemberDashboard = () => {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);

    const fetchMyTasks = async () => {
        const res = await api.get('/tasks');
        // Simple filter for demo
        setTasks(res.data.filter(t => t.assignedTo?._id === user._id));
    };

    useEffect(() => { fetchMyTasks(); }, []);

    const updateStatus = async (taskId, newStatus) => {
        try {
            await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
            toast.info(`Task status: ${newStatus}`);
            fetchMyTasks();
        } catch (err) { toast.error('Update failed'); }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">My Workspace</h1>
                <p className="text-dark-500">Focus on your assigned goals and deliver high-quality work.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map(t => (
                    <div key={t._id} className="bg-dark-700 p-6 rounded-3xl border border-dark-600 flex flex-col group hover:border-primary/50 transition-all shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.status === 'Completed' ? 'bg-green-500/20 text-green-500' :
                                t.status === 'In Progress' ? 'bg-primary/20 text-primary' : 'bg-dark-800 text-dark-500'
                                }`}>
                                {t.status}
                            </span>
                            <span className="text-[10px] font-mono text-dark-500">ID: {t._id.substring(0, 8)}</span>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-4 line-clamp-1">{t.title}</h3>

                        <div className="mt-auto flex items-center space-x-2">
                            {t.status === 'To Do' && (
                                <button onClick={() => updateStatus(t._id, 'In Progress')} className="flex-1 bg-primary text-dark-900 py-3 rounded-2xl font-bold text-xs flex items-center justify-center">
                                    <Play size={14} className="mr-1" /> Start Working
                                </button>
                            )}
                            {t.status === 'In Progress' && (
                                <button onClick={() => updateStatus(t._id, 'Completed')} className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center">
                                    <CheckCircle size={14} className="mr-1" /> Mark Completed
                                </button>
                            )}
                            {t.status === 'Completed' && (
                                <div className="flex-1 text-center py-3 text-dark-500 font-bold text-xs">Well Done!</div>
                            )}
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="lg:col-span-3 py-20 bg-dark-700 rounded-3xl border border-dark-600 border-dashed text-center">
                        <Clock className="mx-auto text-dark-600 mb-4" size={48} />
                        <p className="text-dark-500 font-medium">No tasks assigned to you right now. Take a break!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamMemberDashboard;
