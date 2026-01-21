import Sidebar from './Sidebar';
import { Search, Bell, Moon } from 'lucide-react';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-dark-900 flex">
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 ml-64">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-8 bg-dark-900 sticky top-0 z-10">
                    {/* Breadcrumbs */}
                    <div className="flex items-center text-dark-500 text-sm">
                        <span className="hover:text-white cursor-pointer transition">Dashboards</span>
                        <span className="mx-2">/</span>
                        <span className="text-white">Overview</span>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center space-x-6">
                        {/* Search Bar */}
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-dark-800 border-none rounded-full py-2 pl-10 pr-12 text-sm text-white focus:ring-1 focus:ring-primary placeholder-dark-500 w-64"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-dark-700 rounded text-[10px] px-1.5 py-0.5 text-dark-500 border border-dark-600">
                                ⌘ K
                            </div>
                        </div>

                        <div className="w-px h-6 bg-dark-600"></div>

                        <button className="text-white hover:text-primary transition">
                            <Moon size={20} />
                        </button>

                        <div className="relative">
                            <button className="text-white hover:text-primary transition">
                                <Bell size={20} />
                            </button>
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-dark-900"></span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-8 pt-0">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
