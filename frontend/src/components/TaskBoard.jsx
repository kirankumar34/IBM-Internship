import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../context/api';
import { toast } from 'react-toastify';
import CommentSection from './collaboration/CommentSection';
import FileUpload from './collaboration/FileUpload';
import TimerWidget from './time/TimerWidget';
import TimeLogForm from './time/TimeLogForm';
import {
    Plus,
    Calendar,
    AlertCircle,
    CheckCircle2,
    User as UserIcon,
    MoreVertical,
    X,
    Clock,
    Link as LinkIcon,
    ListTodo,
    MessageCircle,
    Files
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TaskBoard = ({ projectId, members }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // New Task Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        assignedTo: '',
        startDate: '',
        dueDate: '',
        status: 'To Do',
        parentTask: null,
        dependencies: []
    });

    // Process members for dropdown (Team based)
    // PM: See Team Leads grouped by Team
    // TL: See Team Members of their Team
    // Member: Cannot Assign (Should likely be hidden, but we'll disable)
    const getAssignableOptions = () => {
        if (!members) return [];
        const currentRole = user.role;
        const currentId = user._id || user.id;

        if (currentRole === 'super_admin' || currentRole === 'project_admin') {
            // Admins can see everyone, maybe grouped by Role
            const groups = { 'Team Leads': [], 'Team Members': [] };
            members.forEach(m => {
                if (m.role === 'team_leader') groups['Team Leads'].push(m);
                else if (m.role === 'team_member') groups['Team Members'].push(m);
            });
            return Object.entries(groups).map(([role, users]) => ({ label: role, options: users }));
        }

        if (currentRole === 'project_manager') {
            // PM Restriction: ONLY Team Leads
            const teamLeads = members.filter(m => m.role === 'team_leader');
            if (teamLeads.length > 0) {
                return [{ label: 'Team Leaders', options: teamLeads }];
            }
            return [];
        }

        if (currentRole === 'team_leader') {
            // TL can assign to ANY team member in the project
            // Backend enforces that the user must be a project member
            const teamMembers = members.filter(m => m.role === 'team_member');

            if (teamMembers.length > 0) {
                return [{ label: 'Team Members', options: teamMembers }];
            }
            // If no team members, return empty
            return [];
        }

        return [];
    };

    const assignableGroups = getAssignableOptions();



    useEffect(() => {
        fetchTasks();
    }, [projectId]);

    const fetchTasks = async () => {
        try {
            const res = await api.get(`/tasks?projectId=${projectId}`);
            setTasks(res.data);
        } catch (err) {
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (result) => {
        if (!result.destination) return;
        const { draggableId, destination, source } = result;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId;

        if (newStatus === 'Blocked') {
            const reason = prompt('Please enter a reason for blocking this task:');
            if (!reason) return;
            updateStatus(draggableId, newStatus, reason);
        } else {
            updateStatus(draggableId, newStatus);
        }
    };

    const updateStatus = async (taskId, status, blockedReason = '') => {
        const originalTasks = [...tasks];
        setTasks(tasks.map(t => t._id === taskId ? { ...t, status, blockedReason } : t));

        try {
            await api.patch(`/tasks/${taskId}/status`, { status, blockedReason });
        } catch (err) {
            setTasks(originalTasks);
            toast.error(err.response?.data?.message || 'Update failed');
        }
    };


    const handleCreateTask = async (e) => {
        e.preventDefault();
        const taskData = {
            ...formData,
            project: projectId,
            assignedTo: formData.assignedTo || null,
            parentTask: formData.parentTask || null
        };
        try {
            const res = await api.post('/tasks', taskData);
            toast.success('Task created');
            setShowModal(false);
            setFormData({ title: '', description: '', priority: 'Medium', assignedTo: '', startDate: '', dueDate: '', status: 'To Do', parentTask: null, dependencies: [] });
            fetchTasks();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create task');
        }
    };

    const renderPriorityBadge = (priority) => {
        const colors = {
            'High': 'bg-danger/20 text-danger',
            'Critical': 'bg-danger/20 text-danger',
            'Medium': 'bg-warning/20 text-warning',
            'Low': 'bg-success/20 text-success'
        };
        return (
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${colors[priority]}`}>
                {priority}
            </div>
        );
    };

    const columns = {
        'To Do': tasks.filter(t => t.status === 'To Do' && !t.parentTask),
        'In Progress': tasks.filter(t => t.status === 'In Progress' && !t.parentTask),
        'Blocked': tasks.filter(t => t.status === 'Blocked' && !t.parentTask),
        'Completed': tasks.filter(t => t.status === 'Completed' && !t.parentTask)
    };


    const canCreate = user.role !== 'client' && user.role !== 'team_member'; // Simplification based on requirements

    return (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Tasks & Workflow</h2>
                {canCreate && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-primary hover:bg-primary-hover text-dark-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition shadow-lg"
                    >
                        <Plus size={18} className="mr-2" /> New Task
                    </button>
                )}
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {Object.entries(columns).map(([columnId, columnTasks]) => (
                        <div key={columnId} className="bg-dark-700/50 rounded-2xl p-4 border border-dark-600 flex flex-col h-full min-h-[500px]">
                            <h3 className={`font-black uppercase tracking-widest text-xs mb-4 flex items-center justify-between pb-3 border-b border-dark-600
                                ${columnId === 'Completed' ? 'text-success' :
                                    columnId === 'Blocked' ? 'text-danger' :
                                        columnId === 'In Progress' ? 'text-blue-400' : 'text-dark-400'}`}>
                                {columnId}
                                <span className="bg-dark-800 px-2 py-0.5 rounded-md text-white">{columnTasks.length}</span>
                            </h3>

                            <Droppable droppableId={columnId}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-dark-600/50' : ''}`}
                                    >
                                        {columnTasks.map((task, index) => (
                                            <Draggable key={task._id} draggableId={task._id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => setSelectedTask(task)}
                                                        className={`bg-dark-800 p-4 rounded-xl mb-3 border border-dark-600 shadow-sm group hover:border-primary/50 transition cursor-pointer relative
                                                            ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary rotate-2 z-50' : ''}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            {renderPriorityBadge(task.priority)}
                                                            <div className="flex space-x-1">
                                                                {task.dependencies?.length > 0 && <LinkIcon size={12} className="text-warning" />}
                                                                <MoreVertical size={14} className="text-dark-500 opacity-0 group-hover:opacity-100 transition" />
                                                            </div>
                                                        </div>

                                                        <h4 className="text-white font-bold text-sm mb-2 leading-snug">{task.title}</h4>

                                                        {task.status === 'Blocked' && task.blockedReason && (
                                                            <div className="bg-danger/10 border border-danger/20 rounded-lg p-2 mb-3">
                                                                <p className="text-[10px] text-danger-hover font-bold uppercase tracking-tighter mb-1 flex items-center">
                                                                    <AlertCircle size={10} className="mr-1" /> Reason
                                                                </p>
                                                                <p className="text-xs text-white line-clamp-2 italic">"{task.blockedReason}"</p>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-700">
                                                            <div className="flex items-center text-xs text-dark-400">
                                                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] mr-1 font-bold">
                                                                    {task.assignedTo?.name?.charAt(0) || '?'}
                                                                </div>
                                                                {task.assignedTo?.name || 'Unassigned'}
                                                            </div>
                                                            {task.dueDate && (
                                                                <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded
                                                                    ${new Date(task.dueDate) < new Date() && task.status !== 'Completed' ? 'bg-danger/20 text-danger' : 'text-dark-500'}`}>
                                                                    <Clock size={10} className="mr-1" />
                                                                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}

                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>

            {/* Task Detail Modal / Drawer */}
            {selectedTask && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm" onClick={() => setSelectedTask(null)}></div>
                    <div className="relative w-full max-w-lg bg-dark-700 h-full shadow-2xl border-l border-dark-600 p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    {renderPriorityBadge(selectedTask.priority)}
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-dark-800 text-white`}>
                                        {selectedTask.status}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-black text-white">{selectedTask.title}</h2>
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-dark-600 rounded-full transition text-dark-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <section>
                                <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-3">Description</h3>
                                <p className="text-white/80 leading-relaxed bg-dark-800 rounded-xl p-4 border border-dark-600">
                                    {selectedTask.description || 'No description provided.'}
                                </p>
                            </section>

                            {/* Status Update Section */}
                            {(selectedTask.assignedTo?._id === user._id ||
                                ['super_admin', 'project_manager', 'team_leader'].includes(user.role)) && (
                                    <section>
                                        <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-2">Update Status</h3>
                                        <select
                                            value={selectedTask.status}
                                            onChange={(e) => {
                                                const newStatus = e.target.value;
                                                if (newStatus === 'Blocked') {
                                                    const reason = prompt('Please enter a reason for blocking this task:');
                                                    if (reason) {
                                                        updateStatus(selectedTask._id, newStatus, reason);
                                                    }
                                                } else {
                                                    updateStatus(selectedTask._id, newStatus);
                                                }
                                            }}
                                            className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-primary transition"
                                        >
                                            <option value="To Do">To Do</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Blocked">Blocked</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                        <p className="text-xs text-dark-500 mt-2 italic">
                                            💡 You can also drag tasks between columns to update status
                                        </p>
                                    </section>
                                )}

                            <div className="grid grid-cols-2 gap-6">
                                <section>
                                    <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-2">Assignee</h3>
                                    <div className="flex items-center p-3 bg-dark-800 rounded-xl border border-dark-600">
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-dark-900 font-bold mr-3">
                                            {selectedTask.assignedTo?.name?.charAt(0) || '?'}
                                        </div>
                                        <div className="text-sm font-bold text-white">{selectedTask.assignedTo?.name || 'Unassigned'}</div>
                                    </div>
                                </section>
                                <section>
                                    <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-2">Due Date</h3>
                                    <div className="flex items-center p-3 bg-dark-800 rounded-xl border border-dark-600 text-sm italic">
                                        <Calendar size={16} className="mr-2 text-primary" />
                                        {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'Not set'}
                                    </div>
                                </section>
                            </div>

                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest flex items-center">
                                        <ListTodo size={16} className="mr-2" /> Subtasks
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    {tasks.filter(t => t.parentTask === selectedTask._id).length > 0 ? (
                                        tasks.filter(t => t.parentTask === selectedTask._id).map(sub => (
                                            <div key={sub._id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl border border-dark-600">
                                                <div className="flex items-center">
                                                    <CheckCircle2 size={16} className={sub.status === 'Completed' ? 'text-success mr-3' : 'text-dark-600 mr-3'} />
                                                    <span className={`text-sm ${sub.status === 'Completed' ? 'line-through text-dark-500' : 'text-white'}`}>
                                                        {sub.title}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] font-bold text-dark-500 uppercase">{sub.status}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-dark-500 italic py-4 text-center border-2 border-dashed border-dark-600 rounded-xl">No subtasks defined.</p>
                                    )}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-4 flex items-center">
                                    <LinkIcon size={16} className="mr-2" /> Dependencies
                                </h3>
                                <div className="space-y-2">
                                    {selectedTask.dependencies?.length > 0 ? (
                                        selectedTask.dependencies.map(dep => (
                                            <div key={dep._id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl border border-dark-600">
                                                <span className="text-sm text-white font-medium">{dep.title}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase
                                                    ${dep.status === 'Completed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                                                    {dep.status}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-dark-500 italic py-4 text-center border-2 border-dashed border-dark-600 rounded-xl">No dependencies mapped.</p>
                                    )}
                                </div>
                            </section>

                            <section className="pt-6 border-t border-dark-600">
                                <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-6 flex items-center">
                                    <Clock size={16} className="mr-2 text-primary" /> Time Tracking
                                </h3>
                                <div className="space-y-6">
                                    <TimerWidget taskId={selectedTask._id} projectId={projectId} />
                                    <div className="bg-dark-800 p-4 rounded-xl border border-dark-600">
                                        <h4 className="text-[10px] font-black uppercase text-dark-400 mb-4">Manual Log</h4>
                                        <TimeLogForm taskId={selectedTask._id} projectId={projectId} onLogAdded={() => fetchTasks()} />
                                    </div>
                                </div>
                            </section>

                            <section className="pt-6 border-t border-dark-600">
                                <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-6 flex items-center">
                                    <MessageCircle size={16} className="mr-2 text-blue-400" /> Collaboration
                                </h3>
                                <div className="space-y-8">
                                    <CommentSection taskId={selectedTask._id} />
                                    <div className="pt-6 border-t border-dark-800/50">
                                        <h4 className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-4 flex items-center">
                                            <Files size={14} className="mr-2" /> Attachments
                                        </h4>
                                        <FileUpload taskId={selectedTask._id} projectId={projectId} />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Task Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-dark-900/80 backdrop-blur-sm">
                    <div className="bg-dark-700 w-full max-w-lg rounded-3xl border border-dark-600 p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-white">Create New Task</h2>
                            <button onClick={() => setShowModal(false)} className="text-dark-500 hover:text-white transition"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateTask} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest block mb-1">Title</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="What needs to be done?"
                                    className="w-full bg-dark-800 border border-dark-600 rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest block mb-1">Description</label>
                                <textarea
                                    className="w-full bg-dark-800 border border-dark-600 rounded-2xl p-4 text-white h-24 focus:ring-2 focus:ring-primary outline-none transition"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest block mb-1">Priority</label>
                                    <select
                                        className="w-full bg-dark-800 border border-dark-600 rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary outline-none"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                        <option>Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest block mb-1">Assignee</label>
                                    <select
                                        className="w-full bg-dark-800 border border-dark-600 rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary outline-none"
                                        value={formData.assignedTo}
                                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                    >
                                        <option value="">Unassigned</option>

                                        {/* Standard List Fallback if no groups (e.g. mixed/older projects) */}
                                        {assignableGroups.length === 0 && members && members.map(m => (
                                            <option key={m._id} value={m._id}>{m.name}</option>
                                        ))}

                                        {/* Grouped Options */}
                                        {assignableGroups.map(group => (
                                            <optgroup key={group.label} label={group.label} className="font-bold text-primary bg-dark-800">
                                                {group.options.map(m => (
                                                    <option key={m._id} value={m._id} className="text-white bg-dark-700">
                                                        {m.name} ({m.role.replace('_', ' ')})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    {assignableGroups.length === 0 && members.length > 0 && user.role !== 'team_member' && (
                                        <p className="text-[10px] text-warning mt-1">Warning: No team structure detected. Showing flat list.</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest block mb-1">Date Range</label>
                                    <div className="space-y-2">
                                        <input
                                            type="date"
                                            className="w-full bg-dark-800 border border-dark-600 rounded-2xl p-4 text-white text-xs"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="w-full bg-dark-800 border border-dark-600 rounded-2xl p-4 text-white text-xs"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest block mb-1">Parent Task</label>
                                    <select
                                        className="w-full bg-dark-800 border border-dark-600 rounded-2xl p-4 text-white text-xs overflow-hidden"
                                        value={formData.parentTask || ''}
                                        onChange={(e) => setFormData({ ...formData, parentTask: e.target.value || null })}
                                    >
                                        <option value="">No Parent</option>
                                        {tasks.filter(t => !t.parentTask).map(t => (
                                            <option key={t._id} value={t._id}>{t.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest block mb-1">Dependencies</label>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-4 bg-dark-800 rounded-2xl border border-dark-600">
                                    {tasks.map(t => (
                                        <label key={t._id} className="flex items-center space-x-2 text-xs text-white cursor-pointer hover:bg-dark-600 p-1 rounded transition">
                                            <input
                                                type="checkbox"
                                                className="rounded bg-dark-700 border-dark-500 text-primary"
                                                checked={formData.dependencies.includes(t._id)}
                                                onChange={(e) => {
                                                    const deps = e.target.checked
                                                        ? [...formData.dependencies, t._id]
                                                        : formData.dependencies.filter(id => id !== t._id);
                                                    setFormData({ ...formData, dependencies: deps });
                                                }}
                                            />
                                            <span className="truncate">{t.title}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4 pt-6 border-t border-dark-600">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-dark-400 hover:text-white font-bold transition">Cancel</button>
                                <button type="submit" className="px-10 py-3 bg-primary text-dark-900 rounded-2xl font-black hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-95">Create Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TaskBoard;
