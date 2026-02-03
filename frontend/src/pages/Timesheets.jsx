import React, { useState, useEffect, useContext } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, Send, FileText, RefreshCw } from 'lucide-react';
import api from '../context/api';
import AuthContext from '../context/AuthContext';

const Timesheets = () => {
    const { user } = useContext(AuthContext);
    const [currentWeek, setCurrentWeek] = useState(getWeekId(new Date()));
    const [timesheet, setTimesheet] = useState(null);
    const [assignedTasks, setAssignedTasks] = useState([]);
    const [pendingTimesheets, setPendingTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('my');
    const [localEntries, setLocalEntries] = useState({}); // { `${taskId}-${dayIndex}`: duration }

    useEffect(() => {
        if (user && user.id) {
            loadData();
        }
    }, [currentWeek, user]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Parallel fetch
            const promises = [
                api.get(`/timesheets/user/${user.id}/week/${currentWeek}`),
                api.get('/tasks') // Fetch all tasks, filter in FE or use specialized endpoint
            ];

            if (['super_admin', 'project_manager', 'team_leader'].includes(user.role)) {
                promises.push(api.get('/timesheets/pending'));
            }

            const results = await Promise.allSettled(promises);

            // Timesheet
            if (results[0].status === 'fulfilled') {
                const ts = results[0].value.data;
                setTimesheet(ts);

                // Initialize local state from existing entries
                const entriesMap = {};
                ts.entries.forEach(entry => {
                    const date = new Date(entry.date);
                    const dayIndex = (date.getDay() + 6) % 7; // Mon=0, Sun=6
                    const taskId = entry.task?._id || entry.task;
                    entriesMap[`${taskId}-${dayIndex}`] = entry.duration;
                });
                setLocalEntries(entriesMap);
            }

            // Tasks
            if (results[1].status === 'fulfilled') {
                // Filter tasks assigned to user AND active
                const allTasks = results[1].value.data;
                const myTasks = allTasks.filter(t =>
                    t.assignedTo?._id === user.id || t.assignedTo === user.id
                );
                setAssignedTasks(myTasks);
            }

            // Pending
            if (results[2] && results[2].status === 'fulfilled') {
                setPendingTimesheets(results[2].value.data);
            }

        } catch (error) {
            console.error('Data Load Error', error);
        } finally {
            setLoading(false);
        }
    };

    function getWeekId(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
    }

    function getWeekDates(weekId) {
        const [year, week] = weekId.split('-W');
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dow = simple.getDay();
        const weekStart = new Date(simple);
        weekStart.setDate(simple.getDate() - dow + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return { weekStart, weekEnd };
    }

    const handleInputChange = (taskId, dayIndex, value) => {
        const val = parseFloat(value);
        if (isNaN(val) && value !== '') return;

        setLocalEntries(prev => ({
            ...prev,
            [`${taskId}-${dayIndex}`]: value === '' ? 0 : val
        }));
    };

    const handleBlur = async (taskId, dayIndex, projectId) => {
        if (!timesheet || timesheet.status !== 'draft') return;

        const duration = localEntries[`${taskId}-${dayIndex}`] || 0;

        setSaving(true);
        try {
            await api.post('/timesheets/save', {
                timesheetId: timesheet._id,
                entries: [{
                    taskId,
                    dayIndex,
                    duration,
                    projectId
                }]
            });
            // Background refresh to get totals correct
            // Or manually update totals locally to avoid flicker
            const res = await api.get(`/timesheets/user/${user.id}/week/${currentWeek}`);
            setTimesheet(res.data);
        } catch (err) {
            console.error('Save failed', err);
        } finally {
            setSaving(false);
        }
    };

    const getDayTotal = (dayIndex) => {
        let total = 0;
        // Calculate from LOCAL state for immediate feedback
        Object.keys(localEntries).forEach(key => {
            if (key.endsWith(`-${dayIndex}`)) {
                total += parseFloat(localEntries[key]) || 0;
            }
        });
        return total;
    };

    // Combine tasks from Timesheet (history) and Assigned Tasks (current)
    // Ensures tasks logged previously but maybe now unassigned still show up
    // And new assigned tasks show up
    const getVisibleTasks = () => {
        const taskMap = new Map();

        // Add assigned tasks
        assignedTasks.forEach(t => taskMap.set(t._id, t));

        // Add tasks from timesheet entries (if not already there)
        if (timesheet?.entries) {
            timesheet.entries.forEach(e => {
                if (e.task) {
                    const taskId = e.task._id || e.task;
                    if (!taskMap.has(taskId)) {
                        taskMap.set(taskId, { _id: taskId, title: e.task.title || 'Unknown Task', project: e.task.project });
                    }
                }
            });
        }
        return Array.from(taskMap.values());
    };

    const visibleTasks = getVisibleTasks();

    const handleSubmit = async () => {
        if (!timesheet) return;
        if (window.confirm('Are you sure you want to submit? You will not be able to edit this week properly after submission.')) {
            try {
                await api.post('/timesheets/submit', { timesheetId: timesheet._id });
                loadData();
            } catch (error) {
                console.error('Error submitting timesheet:', error);
            }
        }
    };

    // ... handleApprove, handleReject same as before ... 
    const handleApprove = async (id) => {
        try {
            await api.put(`/timesheets/${id}/approve`);
            loadData(); // Reload all
        } catch (error) {
            console.error('Error approving timesheet:', error);
        }
    };

    const handleReject = async (id, reason) => {
        try {
            await api.put(`/timesheets/${id}/reject`, { reason: reason || 'Rejected by manager' });
            loadData();
        } catch (error) {
            console.error('Error rejecting timesheet:', error);
        }
    };

    const navigateWeek = (direction) => {
        const { weekStart } = getWeekDates(currentWeek);
        const newDate = new Date(weekStart);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        setCurrentWeek(getWeekId(newDate));
    };

    const getStatusBadge = (status) => {
        const styles = {
            draft: 'bg-dark-700 text-dark-300',
            submitted: 'bg-yellow-500/20 text-yellow-400',
            approved: 'bg-green-500/20 text-green-400',
            rejected: 'bg-red-500/20 text-red-400'
        };
        const icons = {
            draft: FileText,
            submitted: AlertCircle,
            approved: CheckCircle,
            rejected: XCircle
        };
        const Icon = icons[status] || FileText;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase ${styles[status] || styles.draft}`}>
                <Icon size={12} />
                {status}
            </span>
        );
    };

    const { weekStart, weekEnd } = getWeekDates(currentWeek);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (loading && !timesheet) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white">Timesheets</h1>
                    <p className="text-dark-400 text-sm mt-1">Track and manage your weekly work hours</p>
                </div>
                {['super_admin', 'project_manager', 'team_leader'].includes(user?.role) && (
                    <div className="flex bg-dark-800 rounded-xl p-1 border border-dark-700">
                        <button
                            onClick={() => setActiveTab('my')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'my' ? 'bg-primary text-dark-900' : 'text-dark-300 hover:text-white'}`}
                        >
                            My Timesheet
                        </button>
                        <button
                            onClick={() => setActiveTab('approvals')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition relative ${activeTab === 'approvals' ? 'bg-primary text-dark-900' : 'text-dark-300 hover:text-white'}`}
                        >
                            Pending Approvals
                            {pendingTimesheets.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                                    {pendingTimesheets.length}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'my' && (
                <>
                    {/* Week Navigation */}
                    <div className="flex items-center justify-between bg-dark-800/50 border border-dark-700 rounded-2xl p-4">
                        <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-dark-700 rounded-lg transition">
                            <ChevronLeft className="text-dark-300" />
                        </button>
                        <div className="text-center">
                            <h2 className="text-lg font-bold text-white">
                                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </h2>
                            <p className="text-dark-400 text-xs mt-1">Week {currentWeek.split('-W')[1]}</p>
                        </div>
                        <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-dark-700 rounded-lg transition">
                            <ChevronRight className="text-dark-300" />
                        </button>
                    </div>

                    {/* Timesheet Grid */}
                    <div className="bg-dark-800/50 border border-dark-700 rounded-3xl overflow-hidden">
                        <div className="grid grid-cols-8 border-b border-dark-700">
                            <div className="p-4 bg-dark-900/50 text-dark-400 text-xs font-bold uppercase">Task</div>
                            {days.map((day, i) => (
                                <div key={day} className="p-4 bg-dark-900/50 text-center">
                                    <p className="text-dark-400 text-xs font-bold uppercase">{day}</p>
                                    <p className="text-white text-sm mt-1">
                                        {new Date(weekStart.getTime() + i * 86400000).getDate()}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Entries */}
                        {visibleTasks.length > 0 ? (
                            <div className="divide-y divide-dark-700">
                                {visibleTasks.map((task) => {
                                    return (
                                        <div key={task._id} className="grid grid-cols-8 hover:bg-dark-700/30 transition">
                                            <div className="p-4 flex flex-col justify-center">
                                                <div className="text-white text-sm font-bold truncate" title={task.title}>{task.title}</div>
                                                <div className="text-[10px] text-dark-500 truncate" title={task.project?.name}>{task.project?.name || 'No Project'}</div>
                                            </div>
                                            {days.map((_, dayIdx) => {
                                                const isDraft = timesheet?.status === 'draft';
                                                const val = localEntries[`${task._id}-${dayIdx}`] || '';

                                                return (
                                                    <div key={dayIdx} className="p-2 flex items-center justify-center border-l border-dark-700/50">
                                                        {isDraft ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="24"
                                                                step="0.5"
                                                                className="w-12 bg-dark-900 border border-dark-600 rounded-lg text-center text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none py-2"
                                                                value={val}
                                                                onChange={(e) => handleInputChange(task._id, dayIdx, e.target.value)}
                                                                onBlur={() => handleBlur(task._id, dayIdx, task.project?._id || task.project)}
                                                                placeholder="-"
                                                            />
                                                        ) : (
                                                            <span className="text-dark-300 font-medium">{val > 0 ? `${val}h` : '-'}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-16 text-center text-dark-500 flex flex-col items-center justify-center">
                                <Clock size={48} className="mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-white mb-1">No Tasks Assigned</h3>
                                <p className="text-sm border-b border-dark-600 pb-1">Ask your Project Manager to assign tasks to you.</p>
                            </div>
                        )}

                        {/* Totals Row */}
                        <div className="grid grid-cols-8 bg-dark-900/50 border-t border-dark-700">
                            <div className="p-4 text-dark-400 text-xs font-bold uppercase flex items-center">Daily Total</div>
                            {days.map((_, i) => (
                                <div key={i} className="p-4 text-center text-primary font-black text-sm">
                                    {getDayTotal(i).toFixed(1)}h
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between bg-dark-800/50 border border-dark-700 rounded-2xl p-6">
                        <div className="flex items-center gap-6">
                            <div>
                                <p className="text-dark-400 text-xs uppercase font-bold">Total Hours</p>
                                <p className="text-3xl font-black text-white">{timesheet?.totalHours?.toFixed(1) || 0}h</p>
                            </div>
                            <div className="h-12 w-px bg-dark-700"></div>
                            <div>
                                <p className="text-dark-400 text-xs uppercase font-bold">Status</p>
                                <div className="mt-1">{getStatusBadge(timesheet?.status || 'draft')}</div>
                            </div>
                            {saving && <div className="text-xs text-dark-500 animate-pulse flex items-center"><RefreshCw size={12} className="mr-1 animate-spin" /> Saving...</div>}
                        </div>
                        {timesheet?.status === 'draft' && (
                            <button
                                onClick={handleSubmit}
                                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-dark-900 px-8 py-4 rounded-xl font-bold transition shadow-lg hover:shadow-primary/20"
                            >
                                <Send size={18} />
                                Submit for Approval
                            </button>
                        )}
                        {timesheet?.status === 'rejected' && (
                            <div className="flex items-center gap-4">
                                <p className="text-red-400 text-sm font-bold bg-red-400/10 px-4 py-2 rounded-xl border border-red-400/20">
                                    Rejected: {timesheet.rejectionReason}
                                </p>
                                <button
                                    onClick={handleSubmit}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-dark-900 px-6 py-3 rounded-xl font-bold transition"
                                >
                                    <Send size={18} />
                                    Resubmit
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'approvals' && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Pending Timesheets</h2>
                    {pendingTimesheets.length === 0 ? (
                        <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-16 text-center">
                            <CheckCircle size={64} className="mx-auto text-green-500 mb-6" />
                            <h3 className="text-xl font-black text-white mb-2">All Caught Up!</h3>
                            <p className="text-dark-400 text-sm">No timesheets currently pending approval.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingTimesheets.map(ts => (
                                <div key={ts._id} className="bg-dark-800/50 border border-dark-700 rounded-2xl p-6 hover:border-dark-500 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-dark-700 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-inner">
                                                {ts.user?.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-lg">{ts.user?.name}</p>
                                                <p className="text-dark-400 text-xs font-mono uppercase tracking-wide">
                                                    {new Date(ts.weekStartDate).toLocaleDateString()} — {new Date(ts.weekEndDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-dark-400 text-xs uppercase font-bold">Total</p>
                                                <p className="text-2xl font-black text-white">{ts.totalHours?.toFixed(1)}h</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {user.role === 'team_leader' ? (
                                                    <span className="text-[10px] bg-dark-700 text-dark-400 px-4 py-2 rounded-xl border border-dark-600 font-bold uppercase tracking-widest">
                                                        Review Only
                                                    </span>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(ts._id)}
                                                            className="p-3 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition border border-green-500/20"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={22} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = window.prompt("Rejection Reason (Required):");
                                                                if (reason) handleReject(ts._id, reason);
                                                            }}
                                                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition border border-red-500/20"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={22} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Timesheets;
