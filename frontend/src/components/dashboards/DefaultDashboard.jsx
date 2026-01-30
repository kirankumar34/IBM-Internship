import { useState, useEffect, useContext } from 'react';
import api from '../../context/api';
import AuthContext from '../../context/AuthContext';
import { toast } from 'react-toastify';
import {
    TrendingUp,
    TrendingDown,
    MoreVertical,
    Briefcase,
    Plus
} from 'lucide-react';
import {
    AreaChart,
    Area,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const DefaultDashboard = () => {
    const { user } = useContext(AuthContext);
    const [projects, setProjects] = useState([]);
    const [stats, setStats] = useState({
        totalTasks: 0,
        activeTasks: 0,
        pendingTasksTrend: 0
    });

    const [showModal, setShowModal] = useState(false);
    const [newProject, setNewProject] = useState({
        name: '', description: '', startDate: '', endDate: ''
    });

    const [chartData, setChartData] = useState([]);

    const COLORS = ['#D1F366', '#FFFFFF', '#555555', '#333333'];

    const fetchData = async () => {
        try {
            const [projRes, tasksRes] = await Promise.all([
                api.get('/projects'),
                api.get('/tasks')
            ]);

            setProjects(projRes.data);

            const tasks = tasksRes.data;
            const total = tasks.length;
            const active = tasks.filter(t => t.status !== 'Completed').length;

            setStats({
                totalTasks: total,
                activeTasks: active,
                pendingTasksTrend: 11 // Mock trend for now
            });

            // Mock Profit Data (since no backend for finance yet)
            setChartData([
                { name: 'Mon', value: 4000 },
                { name: 'Tue', value: 3000 },
                { name: 'Wed', value: 2000 },
                { name: 'Thu', value: 2780 },
                { name: 'Fri', value: 1890 },
                { name: 'Sat', value: 2390 },
                { name: 'Sun', value: 3490 },
            ]);

        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects', newProject);
            toast.success('Project created!');
            setShowModal(false);
            fetchData();
            setNewProject({ name: '', description: '', startDate: '', endDate: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create project');
        }
    };

    // Re-enabled for Super Admin as per Module 5 requirements
    const canCreate = user?.role === 'super_admin';

    // Metrics Calculation
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'Active' || p.status === 'In Progress').length;

    // Calculate overall completion percentage
    const avgProgress = projects.length > 0
        ? Math.round(projects.reduce((acc, curr) => acc + (curr.progress || 0), 0) / projects.length)
        : 0;

    // Pie Chart Data
    const pieData = [
        { name: 'Completed', value: projects.filter(p => p.status === 'Completed').length },
        { name: 'Active', value: projects.filter(p => p.status === 'Active' || p.status === 'In Progress').length },
        { name: 'On Hold', value: projects.filter(p => p.status === 'On Hold').length },
        { name: 'Planned', value: Math.max(0, totalProjects - activeProjects) } // Just a placeholder logic
    ];

    // If no data, show empty placeholder in pie
    const hasData = pieData.some(d => d.value > 0);
    const finalPieData = hasData ? pieData : [{ name: 'No Data', value: 1 }];

    const pendingTasks = stats.activeTasks;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Projects', value: totalProjects, change: '+0.4%', isPositive: true },
                    { label: 'Active Projects', value: activeProjects, change: '32%', isPositive: true },
                    { label: 'Completion Rate', value: `${avgProgress}%`, type: 'circle' },
                    { label: 'Pending Tasks', value: pendingTasks.toLocaleString(), change: '11%', isPositive: true },
                ].map((item, index) => (
                    <div key={index} className="bg-dark-700 p-6 rounded-2xl border border-dark-600">
                        <h3 className="text-dark-500 text-sm font-medium mb-4">{item.label}</h3>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-3xl font-bold text-white mb-1">{item.value}</div>
                                {item.change && (
                                    <div className={`flex items-center text-xs font-bold ${item.isPositive ? 'text-primary' : 'text-red-500'}`}>
                                        {item.isPositive ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                                        {item.change} vs last month
                                    </div>
                                )}
                            </div>
                            {item.type === 'circle' && (
                                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Middle Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-96">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-dark-700 p-6 rounded-2xl border border-dark-600 relative flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white text-lg font-semibold">Project Status</h3>
                        <button><MoreVertical className="text-dark-500" size={20} /></button>
                    </div>

                    <div className="flex flex-col md:flex-row items-center h-full pb-0 md:pb-10 flex-1">
                        <div className="w-full md:w-1/2 h-64 relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={finalPieData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {finalPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-white">{totalProjects}</span>
                                <span className="text-xs text-dark-500">Total</span>
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 space-y-4 px-4">
                            {finalPieData.map((d, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center text-sm text-dark-500">
                                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        {d.name}
                                    </div>
                                    <span className="text-white font-bold">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Mini Cards */}
                <div className="space-y-6">
                    <div className="bg-dark-700 p-6 rounded-2xl border border-dark-600 h-[calc(50%-12px)]">
                        <div className="flex justify-between mb-2">
                            <div className="bg-primary/20 p-2 rounded-lg text-primary"><Briefcase size={18} /></div>
                        </div>
                        <div className="text-dark-500 text-xs">New Projects</div>
                        <div className="text-2xl font-bold text-white">12 <span className="text-xs text-primary font-normal">+8%</span></div>
                    </div>
                    <div className="bg-dark-700 p-6 rounded-2xl border border-dark-600 h-[calc(50%-12px)] relative overflow-hidden flex flex-col">
                        <h3 className="text-dark-500 text-sm">Total Profit</h3>
                        <div className="text-2xl font-bold text-white mb-4">$136,755.77</div>
                        <div className="flex-1 min-h-[60px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorPv)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Project List */}
                <div className="lg:col-span-2 bg-dark-700 rounded-2xl border border-dark-600 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white text-lg font-semibold">Projects List</h3>
                        {canCreate && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-primary hover:bg-primary-hover text-dark-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition"
                            >
                                <Plus size={14} className="mr-1" /> New
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-dark-500 border-b border-dark-600">
                                    <th className="pb-3 pl-2">Project Name</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Owner</th>
                                    <th className="pb-3 text-right">Deadline</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {projects.map((project, i) => (
                                    <tr key={project._id} className="border-b border-dark-600 last:border-0 hover:bg-dark-800 transition">
                                        <td className="py-4 pl-2 flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-xs font-bold text-white">
                                                {project.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">{project.name}</div>
                                                <div className="text-dark-500 text-xs">{project.description}</div>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider
                                                ${project.status === 'Active' ? 'bg-primary/10 text-primary' :
                                                    project.status === 'Completed' ? 'bg-blue-500/10 text-blue-400' :
                                                        'bg-gray-500/10 text-gray-400'}`}>
                                                {project.status}
                                            </span>
                                        </td>
                                        <td className="py-4 text-dark-500">
                                            {project.owner?.name || 'Unknown'}
                                        </td>
                                        <td className="py-4 text-right text-dark-500 font-mono">
                                            {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {projects.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-dark-500">
                                            No projects found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Promo Card */}
                <div className="bg-gradient-to-br from-dark-700 to-green-900/20 p-6 rounded-2xl border border-dark-600 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                            <TrendingUp size={20} />
                        </div>
                        <button><MoreVertical className="text-dark-500" size={20} /></button>
                    </div>

                    <div className="mt-8">
                        <div className="text-4xl font-bold text-white mb-2">$30 <span className="text-sm text-dark-500 font-normal">/ Month</span></div>
                        <p className="text-dark-500 text-sm mb-6">Improve your workplace, view and analyze your profits and losses.</p>
                        <button className="w-full bg-primary hover:bg-primary-hover text-dark-900 font-bold py-3 rounded-xl transition">
                            Get Started
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-dark-700 rounded-2xl border border-dark-600 max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-white mb-4">Create New Project</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input
                                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white focus:ring-2 focus:ring-primary focus:outline-none transition"
                                placeholder="Project Name"
                                value={newProject.name}
                                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                required
                            />
                            <textarea
                                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white focus:ring-2 focus:ring-primary focus:outline-none transition"
                                placeholder="Description"
                                rows="3"
                                value={newProject.description}
                                onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-dark-500 mb-1 block">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-xl text-white focus:ring-2 focus:ring-primary"
                                        value={newProject.startDate}
                                        onChange={e => setNewProject({ ...newProject, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-dark-500 mb-1 block">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-xl text-white focus:ring-2 focus:ring-primary"
                                        value={newProject.endDate}
                                        onChange={e => setNewProject({ ...newProject, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-dark-500 hover:text-white transition">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-primary text-dark-900 font-bold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20">Launch Project</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DefaultDashboard;
