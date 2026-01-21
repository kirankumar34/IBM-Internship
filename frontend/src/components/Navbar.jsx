import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { LogOut, Layout, User } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const onLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white shadow border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center text-primary font-bold text-xl">
                            <Layout className="w-8 h-8 mr-2" />
                            ZohoClone
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <div className="text-gray-700 flex items-center">
                                    <User className="w-5 h-5 mr-1" />
                                    <span className="font-medium mr-1">{user.name}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full uppercase border border-gray-300">
                                        {user.role}
                                    </span>
                                </div>
                                <button
                                    onClick={onLogout}
                                    className="flex items-center text-gray-500 hover:text-red-600 transition"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <div className="space-x-4">
                                <Link to="/login" className="text-gray-500 hover:text-gray-900">Login</Link>
                                <Link to="/register" className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">Register</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
