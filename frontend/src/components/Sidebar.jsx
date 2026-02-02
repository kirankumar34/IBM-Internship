import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Folder,
    Users,
    Settings,
    HelpCircle,
    MessageSquare,
    LogOut,
    Activity,
    Clock
} from 'lucide-react';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

const Sidebar = () => {
    const location = useLocation();
    const { logout, user } = useContext(AuthContext);

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'Overview' },
        { path: '/projects', icon: Folder, label: 'Projects' },
        { path: '/team', icon: Users, label: 'Team Members' },
        { path: '/timesheets', icon: Clock, label: 'Timesheets' },
    ];

    if (['super_admin', 'project_admin', 'project_manager', 'team_leader'].includes(user?.role)) {
        menuItems.push({ path: '/analytics', icon: Activity, label: 'Analytics' });
    }

    const generalItems = [
        { path: '/messages', icon: MessageSquare, label: 'Messages' },
        { path: '/settings', icon: Settings, label: 'Settings' },
        { path: '/help', icon: HelpCircle, label: 'Help Centre' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="w-64 min-h-screen bg-dark-800 border-r border-dark-600 flex flex-col p-6 fixed left-0 top-0">
            {/* User Profile / Brand */}
            <div className="flex items-center space-x-3 mb-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-green-400 flex items-center justify-center text-dark-900 font-bold">
                    {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                    <h3 className="text-white font-semibold text-sm truncate w-32">{user?.name || 'User'}</h3>
                    <p className="text-dark-400 text-[10px] capitalize">{user?.role?.replace('_', ' ') || 'Guest'}</p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1">
                <div className="mb-8">
                    <p className="text-dark-400 text-xs font-bold uppercase mb-4 tracking-wider">Dashboards</p>
                    <nav className="space-y-2">
                        {menuItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive(item.path)
                                    ? 'bg-primary text-dark-900 shadow-[0_0_15px_rgba(209,243,102,0.3)]'
                                    : 'text-dark-400 hover:text-white hover:bg-dark-700'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                <div>
                    <p className="text-dark-400 text-xs font-bold uppercase mb-4 tracking-wider">Settings</p>
                    <nav className="space-y-2">
                        {generalItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="flex items-center space-x-3 px-4 py-3 rounded-xl text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                            >
                                <item.icon size={20} />
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        ))}

                        <button
                            onClick={logout}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-dark-400 hover:text-red-400 hover:bg-dark-700 transition-colors mt-4"
                        >
                            <LogOut size={20} />
                            <span className="font-medium text-sm">Logout</span>
                        </button>
                    </nav>
                </div>
            </div>

            {/* Bottom Brand */}
            <div className="mt-6 pt-6 border-t border-dark-600 flex items-center text-dark-400 space-x-2">
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                </div>
                <span className="text-xs font-bold tracking-widest">DWISON</span>
            </div>
        </div>
    );
};

export default Sidebar;
