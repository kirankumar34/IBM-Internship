import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { User, Bell, Lock, Globe } from 'lucide-react';

const Settings = () => {
    const { user } = useContext(AuthContext);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-white">Settings</h1>

            <div className="bg-dark-700 rounded-2xl border border-dark-600 overflow-hidden">
                <div className="p-6 border-b border-dark-600">
                    <h2 className="text-lg font-bold text-white flex items-center">
                        <User className="mr-2 text-primary" size={20} /> Profile Settings
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm text-dark-500 mb-2 block">Full Name</label>
                            <input disabled value={user.name} className="w-full bg-dark-800 border-dark-600 rounded-lg py-2 px-4 text-dark-400 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="text-sm text-dark-500 mb-2 block">Email Address</label>
                            <input disabled value={user.email} className="w-full bg-dark-800 border-dark-600 rounded-lg py-2 px-4 text-dark-400 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="text-sm text-dark-500 mb-2 block">Role</label>
                            <input disabled value={user.role} className="w-full bg-dark-800 border-dark-600 rounded-lg py-2 px-4 text-dark-400 cursor-not-allowed capitalize" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-dark-700 rounded-2xl border border-dark-600 overflow-hidden">
                <div className="p-6 border-b border-dark-600">
                    <h2 className="text-lg font-bold text-white flex items-center">
                        <Bell className="mr-2 text-primary" size={20} /> Notifications
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    {['Email Notifications', 'Push Notifications', 'Weekly Digest'].map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <span className="text-white text-sm">{item}</span>
                            <div className="w-11 h-6 bg-dark-800 rounded-full relative cursor-pointer border border-dark-600">
                                <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-dark-500"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Settings;
